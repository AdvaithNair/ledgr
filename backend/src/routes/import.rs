use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::{Datelike, NaiveDate};
use serde::Deserialize;
use sqlx::PgPool;
use std::collections::HashMap;

use crate::models::analytics::*;
use crate::models::import::ImportRecord;

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/import-history", get(get_import_history))
        .route("/stats/summary", get(get_summary))
        .route("/stats/monthly", get(get_monthly))
        .route("/stats/merchants", get(get_merchants))
        .route("/stats/patterns", get(get_patterns))
        .route("/stats/recurring", get(get_recurring))
        .route("/stats/anomalies", get(get_anomalies))
        .route("/stats/forecast", get(get_forecast))
        .route("/stats/habits", get(get_habits))
        .route("/stats/daily", get(get_daily))
        .route("/stats/category/:category", get(get_category_deep_dive))
        .route("/insights", get(get_insights))
}

// ── Helpers ──

fn days_in_month(year: i32, month: u32) -> u32 {
    if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    }
    .unwrap()
    .signed_duration_since(NaiveDate::from_ymd_opt(year, month, 1).unwrap())
    .num_days() as u32
}

fn linear_projection(spent: f64, days_elapsed: u32, days_in_month: u32) -> f64 {
    if days_elapsed == 0 {
        return 0.0;
    }
    (spent / days_elapsed as f64) * days_in_month as f64
}

fn ewma(monthly_totals: &[f64], alpha: f64) -> f64 {
    if monthly_totals.is_empty() {
        return 0.0;
    }
    let mut result = monthly_totals[0];
    for &total in &monthly_totals[1..] {
        result = alpha * total + (1.0 - alpha) * result;
    }
    result
}

// ── Import History ──

async fn get_import_history(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let records: Vec<ImportRecord> = match sqlx::query_as(
        "SELECT * FROM import_history ORDER BY imported_at DESC",
    )
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Failed to fetch import history: {e}");
            Vec::new()
        }
    };

    Json(serde_json::json!({ "data": records }))
}

// ── Enhanced Summary ──

async fn get_summary(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let total: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::bigint FROM transactions",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));

    let by_card: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT card, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY card ORDER BY SUM(amount) DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let by_category: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY category ORDER BY SUM(amount) DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let this_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let last_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date \
         AND date < date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    // New: average monthly spending
    let avg_monthly: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) / \
         GREATEST(COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1) \
         FROM transactions",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let now = chrono::Local::now().naive_local().date();
    let d_elapsed = now.day();
    let d_in_month = days_in_month(now.year(), now.month());

    let daily_rate = if d_elapsed > 0 {
        this_month.0 / d_elapsed as f64
    } else {
        0.0
    };
    let projected_month_total = daily_rate * d_in_month as f64;

    let mom_change_pct = if last_month.0 > 0.0 {
        Some((this_month.0 - last_month.0) / last_month.0 * 100.0)
    } else {
        None
    };

    let vs_avg_pct = if avg_monthly.0 > 0.0 {
        Some((this_month.0 - avg_monthly.0) / avg_monthly.0 * 100.0)
    } else {
        None
    };

    Json(serde_json::json!({
        "data": {
            "total_spent": total.0,
            "transaction_count": count.0,
            "this_month": this_month.0,
            "last_month": last_month.0,
            "mom_change_pct": mom_change_pct,
            "avg_monthly": avg_monthly.0,
            "vs_avg_pct": vs_avg_pct,
            "daily_rate": daily_rate,
            "projected_month_total": projected_month_total,
            "by_card": by_card.iter().map(|(card, total, count)| {
                let avg = if *count > 0 { *total / *count as f64 } else { 0.0 };
                serde_json::json!({ "card": card, "total": total, "count": count, "avg_amount": avg })
            }).collect::<Vec<_>>(),
            "by_category": by_category.iter().map(|(cat, total, count)| {
                let avg = if *count > 0 { *total / *count as f64 } else { 0.0 };
                serde_json::json!({ "category": cat, "total": total, "count": count, "avg_amount": avg })
            }).collect::<Vec<_>>()
        }
    }))
}

// ── Enhanced Monthly ──

async fn get_monthly(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let monthly: Vec<(String, f64, i64, Option<f64>, Option<f64>)> = sqlx::query_as(
        "SELECT \
           to_char(date, 'YYYY-MM') as month, \
           COALESCE(SUM(amount::float8), 0) as total, \
           COUNT(*)::bigint as count, \
           LAG(SUM(amount::float8)) OVER (ORDER BY to_char(date, 'YYYY-MM'))::float8 as prev_total, \
           AVG(SUM(amount::float8)) OVER ( \
             ORDER BY to_char(date, 'YYYY-MM') \
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW \
           )::float8 as rolling_3mo_avg \
         FROM transactions \
         GROUP BY to_char(date, 'YYYY-MM') \
         ORDER BY month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let monthly_by_card: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, card, COALESCE(SUM(amount::float8), 0) \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM'), card ORDER BY month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let monthly_by_category: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, category, COALESCE(SUM(amount::float8), 0) \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM'), category ORDER BY month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({
        "data": {
            "monthly": monthly.iter().map(|(m, total, count, prev, rolling)| {
                let growth_pct = prev.map(|p| {
                    if p > 0.0 { (*total - p) / p * 100.0 } else { 0.0 }
                });
                serde_json::json!({
                    "month": m,
                    "total": total,
                    "count": count,
                    "prev_total": prev,
                    "growth_pct": growth_pct,
                    "rolling_3mo_avg": rolling
                })
            }).collect::<Vec<_>>(),
            "monthly_by_card": monthly_by_card.iter().map(|(m, card, total)| {
                serde_json::json!({ "month": m, "card": card, "total": total })
            }).collect::<Vec<_>>(),
            "monthly_by_category": monthly_by_category.iter().map(|(m, cat, total)| {
                serde_json::json!({ "month": m, "category": cat, "total": total })
            }).collect::<Vec<_>>()
        }
    }))
}

// ── Enhanced Merchants ──

async fn get_merchants(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let merchants: Vec<(String, f64, i64, f64, NaiveDate, NaiveDate, i32)> = sqlx::query_as(
        "SELECT \
           COALESCE(merchant_normalized, description) as merchant, \
           COALESCE(SUM(amount::float8), 0) as total, \
           COUNT(*)::bigint as count, \
           COALESCE(AVG(amount::float8), 0) as avg_amount, \
           MIN(date) as first_seen, \
           MAX(date) as last_seen, \
           COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months \
         FROM transactions \
         GROUP BY COALESCE(merchant_normalized, description) \
         ORDER BY SUM(amount) DESC \
         LIMIT 20",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({
        "data": merchants.iter().map(|(merchant, total, count, avg, first, last, months)| {
            let freq = if *months > 0 { *count as f64 / *months as f64 } else { 0.0 };
            serde_json::json!({
                "merchant": merchant,
                "total": total,
                "count": count,
                "avg_amount": avg,
                "first_seen": first,
                "last_seen": last,
                "active_months": months,
                "monthly_frequency": freq
            })
        }).collect::<Vec<_>>()
    }))
}

// ── Patterns (unchanged) ──

async fn get_patterns(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let day_of_week: Vec<(f64, f64, i64)> = sqlx::query_as(
        "SELECT EXTRACT(DOW FROM date)::float8, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY EXTRACT(DOW FROM date) ORDER BY EXTRACT(DOW FROM date)",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let day_of_month: Vec<(f64, f64, i64)> = sqlx::query_as(
        "SELECT EXTRACT(DAY FROM date)::float8, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY EXTRACT(DAY FROM date) ORDER BY EXTRACT(DAY FROM date)",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    Json(serde_json::json!({
        "data": {
            "day_of_week": day_of_week.iter().map(|(dow, total, count)| {
                serde_json::json!({
                    "day": day_names.get(*dow as usize).unwrap_or(&"?"),
                    "day_num": *dow as i32,
                    "total": total,
                    "count": count
                })
            }).collect::<Vec<_>>(),
            "day_of_month": day_of_month.iter().map(|(dom, total, count)| {
                serde_json::json!({ "day": *dom as i32, "total": total, "count": count })
            }).collect::<Vec<_>>()
        }
    }))
}

// ── Recurring Detection ──

async fn get_recurring(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let rows: Vec<(String, i32, i32, f64, f64, NaiveDate, NaiveDate)> = sqlx::query_as(
        "SELECT \
           COALESCE(merchant_normalized, description) as merchant, \
           COUNT(*)::int as total_count, \
           COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months, \
           COALESCE(AVG(amount::float8), 0) as avg_amount, \
           COALESCE(STDDEV(amount::float8), 0) as amount_stddev, \
           MIN(date) as first_seen, \
           MAX(date) as last_seen \
         FROM transactions \
         GROUP BY COALESCE(merchant_normalized, description) \
         HAVING COUNT(DISTINCT to_char(date, 'YYYY-MM')) >= 3 \
         ORDER BY AVG(amount) DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let today = chrono::Local::now().naive_local().date();
    let mut recurring = Vec::new();

    for (merchant, total_count, active_months, avg_amount, stddev, first_seen, last_seen) in &rows {
        // Filter: stddev < 20% of avg and roughly monthly frequency
        if avg_amount.abs() < 0.01 {
            continue;
        }
        if *stddev > *avg_amount * 0.2 {
            continue;
        }
        let freq = *total_count as f64 / *active_months as f64;
        if freq < 0.7 || freq > 1.5 {
            continue;
        }

        let last_gap_days = today.signed_duration_since(*last_seen).num_days();
        let status = if last_gap_days <= 45 { "active" } else { "inactive" };
        let potentially_forgotten = status == "inactive" && *active_months >= 3;

        let frequency = if freq > 1.3 {
            "biweekly".to_string()
        } else {
            "monthly".to_string()
        };

        recurring.push(RecurringTransaction {
            merchant: merchant.clone(),
            avg_amount: *avg_amount,
            frequency,
            active_months: *active_months,
            first_seen: *first_seen,
            last_seen: *last_seen,
            estimated_annual: *avg_amount * 12.0,
            status: status.to_string(),
            last_gap_days,
            potentially_forgotten,
        });
    }

    let total_monthly: f64 = recurring
        .iter()
        .filter(|r| r.status == "active")
        .map(|r| r.avg_amount)
        .sum();

    Json(serde_json::json!({
        "data": RecurringData {
            total_monthly_recurring: total_monthly,
            total_annual_recurring: total_monthly * 12.0,
            recurring,
        }
    }))
}

// ── Anomaly Detection ──

async fn get_anomalies(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    // Category baselines
    let baselines: Vec<(String, f64, f64, i32)> = sqlx::query_as(
        "WITH monthly_cat AS ( \
           SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total \
           FROM transactions GROUP BY category, to_char(date, 'YYYY-MM') \
         ) \
         SELECT category, AVG(total)::float8 as avg_monthly, \
           COALESCE(STDDEV(total), 0)::float8 as stddev_monthly, \
           COUNT(*)::int as month_count \
         FROM monthly_cat GROUP BY category HAVING COUNT(*) >= 2",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Current month per category
    let current: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) as total \
         FROM transactions WHERE date >= date_trunc('month', CURRENT_DATE)::date \
         GROUP BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let current_map: HashMap<String, f64> = current.into_iter().collect();

    let mut category_anomalies = Vec::new();
    for (category, avg, stddev, _month_count) in &baselines {
        if *stddev < 0.01 {
            continue;
        }
        let current_val = current_map.get(category).copied().unwrap_or(0.0);
        let z = (current_val - avg) / stddev;
        if z > 1.5 {
            let severity = if z > 3.0 {
                "critical"
            } else if z > 2.0 {
                "high"
            } else {
                "elevated"
            };
            let pct_above = (current_val - avg) / avg * 100.0;
            category_anomalies.push(CategoryAnomaly {
                category: category.clone(),
                current_month: current_val,
                avg_monthly: *avg,
                stddev: *stddev,
                z_score: z,
                severity: severity.to_string(),
                pct_above_avg: pct_above,
                message: format!(
                    "{} spending is {:.0}% above average this month",
                    category, pct_above
                ),
            });
        }
    }

    // Transaction anomalies
    let txn_anomalies: Vec<(uuid::Uuid, NaiveDate, String, f64, String, f64)> = sqlx::query_as(
        "WITH cat_avg AS ( \
           SELECT category, AVG(amount::float8) as avg_amount FROM transactions GROUP BY category \
         ) \
         SELECT t.id, t.date, t.description, t.amount::float8 as amount, \
           t.category, ca.avg_amount as category_avg \
         FROM transactions t \
         JOIN cat_avg ca ON t.category = ca.category \
         WHERE t.date >= date_trunc('month', CURRENT_DATE)::date \
           AND t.amount::float8 > ca.avg_amount * 2 \
         ORDER BY t.amount::float8 / ca.avg_amount DESC \
         LIMIT 10",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let transaction_anomalies: Vec<TransactionAnomaly> = txn_anomalies
        .into_iter()
        .map(|(id, date, description, amount, category, cat_avg)| {
            let times = if cat_avg > 0.0 { amount / cat_avg } else { 0.0 };
            TransactionAnomaly {
                id,
                date,
                description: description.clone(),
                amount,
                category: category.clone(),
                category_avg: cat_avg,
                times_avg: times,
                message: format!(
                    "{} is {:.1}x the average {} transaction",
                    description, times, category
                ),
            }
        })
        .collect();

    Json(serde_json::json!({
        "data": AnomaliesData {
            category_anomalies,
            transaction_anomalies,
        }
    }))
}

// ── Spending Forecast ──

async fn get_forecast(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let now = chrono::Local::now().naive_local().date();
    let d_elapsed = now.day();
    let d_in_month = days_in_month(now.year(), now.month());
    let d_remaining = d_in_month - d_elapsed;

    // Current month spent
    let this_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    // Historical monthly totals for EWMA
    let monthly_totals: Vec<(String, f64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, COALESCE(SUM(amount::float8), 0) \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM') ORDER BY month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let totals: Vec<f64> = monthly_totals.iter().map(|(_, t)| *t).collect();

    // Day-of-month historical averages for day-weighted projection
    let dom_avgs: Vec<(f64, f64)> = sqlx::query_as(
        "SELECT EXTRACT(DAY FROM date)::float8 as dom, AVG(amount::float8) as avg_daily \
         FROM ( \
           SELECT date, SUM(amount::float8) as amount FROM transactions GROUP BY date \
         ) daily \
         GROUP BY EXTRACT(DAY FROM date) ORDER BY dom",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let dom_map: HashMap<u32, f64> = dom_avgs
        .iter()
        .map(|(d, a)| (*d as u32, *a))
        .collect();

    // Day-weighted projection
    let overall_daily_avg: f64 = if dom_avgs.is_empty() {
        0.0
    } else {
        dom_avgs.iter().map(|(_, a)| a).sum::<f64>() / dom_avgs.len() as f64
    };
    let mut day_weighted = this_month.0;
    for day in (d_elapsed + 1)..=d_in_month {
        day_weighted += dom_map.get(&day).copied().unwrap_or(overall_daily_avg);
    }

    let linear = linear_projection(this_month.0, d_elapsed, d_in_month);
    let ewma_val = ewma(&totals, 0.3);
    let recommended = (linear + day_weighted + ewma_val) / 3.0;

    // Last month & avg for comparison
    let last_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date \
         AND date < date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let avg_monthly: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) / \
         GREATEST(COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1) FROM transactions",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let vs_last_month = if last_month.0 > 0.0 {
        serde_json::json!({
            "last_month_total": last_month.0,
            "projected_diff": recommended - last_month.0,
            "projected_diff_pct": (recommended - last_month.0) / last_month.0 * 100.0
        })
    } else {
        serde_json::json!(null)
    };

    let vs_average = if avg_monthly.0 > 0.0 {
        serde_json::json!({
            "avg_monthly": avg_monthly.0,
            "projected_diff": recommended - avg_monthly.0,
            "projected_diff_pct": (recommended - avg_monthly.0) / avg_monthly.0 * 100.0
        })
    } else {
        serde_json::json!(null)
    };

    // Category forecasts
    let cat_current: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date GROUP BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let cat_avg: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) / \
         GREATEST(COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1) \
         FROM transactions GROUP BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let cat_avg_map: HashMap<String, f64> = cat_avg.into_iter().collect();

    let category_forecasts: Vec<CategoryForecast> = cat_current
        .iter()
        .map(|(cat, spent)| {
            let projected = linear_projection(*spent, d_elapsed, d_in_month);
            let avg = cat_avg_map.get(cat).copied().unwrap_or(0.0);
            let vs_avg_pct = if avg > 0.0 { (projected - avg) / avg * 100.0 } else { 0.0 };
            let trend = if projected > avg * 1.1 {
                "up"
            } else if projected < avg * 0.9 {
                "down"
            } else {
                "stable"
            };
            CategoryForecast {
                category: cat.clone(),
                spent_so_far: *spent,
                projected,
                avg_monthly: avg,
                vs_avg_pct,
                trend: trend.to_string(),
            }
        })
        .collect();

    let trajectory = if avg_monthly.0 > 0.0 {
        let ratio = recommended / avg_monthly.0;
        if ratio < 0.9 {
            "below_average"
        } else if ratio <= 1.1 {
            "near_average"
        } else if ratio <= 1.3 {
            "above_average"
        } else {
            "well_above_average"
        }
    } else {
        "near_average"
    };

    Json(serde_json::json!({
        "data": ForecastData {
            current_month: CurrentMonthStatus {
                spent_so_far: this_month.0,
                days_elapsed: d_elapsed,
                days_remaining: d_remaining,
                days_in_month: d_in_month,
            },
            projections: Projections {
                linear,
                day_weighted,
                ewma: ewma_val,
                recommended,
            },
            vs_last_month,
            vs_average,
            category_forecasts,
            trajectory: trajectory.to_string(),
        }
    }))
}

// ── Bad Habits Detection ──

async fn get_habits(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    // Impulse spending
    let impulse: (i32, i32, f64, f64) = sqlx::query_as(
        "SELECT \
           COUNT(*)::int as total_count, \
           COUNT(*) FILTER (WHERE amount::float8 < 15)::int as small_count, \
           COALESCE(SUM(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as small_total, \
           COALESCE(AVG(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as avg_small \
         FROM transactions \
         WHERE date >= (CURRENT_DATE - interval '90 days')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0, 0, 0.0, 0.0));

    let small_pct = if impulse.0 > 0 {
        impulse.1 as f64 / impulse.0 as f64 * 100.0
    } else {
        0.0
    };
    let (imp_score, imp_label) = if small_pct > 50.0 {
        (0.8, "high")
    } else if small_pct > 35.0 {
        (0.5, "moderate")
    } else if small_pct > 20.0 {
        (0.3, "low")
    } else {
        (0.1, "minimal")
    };
    let monthly_small_total = impulse.2 / 3.0;

    let impulse_spending = ImpulseSpending {
        score: imp_score,
        label: imp_label.to_string(),
        small_transaction_pct: small_pct,
        avg_small_amount: impulse.3,
        monthly_small_total,
        message: format!(
            "{:.0}% of transactions are under $15 (${:.0}/month in small purchases)",
            small_pct, monthly_small_total
        ),
    };

    // Category creep
    let cat_monthly: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total \
         FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '6 months')::date \
         GROUP BY category, to_char(date, 'YYYY-MM') \
         ORDER BY category, month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut cat_map: HashMap<String, Vec<(String, f64)>> = HashMap::new();
    for (cat, month, total) in &cat_monthly {
        cat_map
            .entry(cat.clone())
            .or_default()
            .push((month.clone(), *total));
    }

    let mut category_creep = Vec::new();
    for (cat, months) in &cat_map {
        if months.len() < 4 {
            continue;
        }
        let mid = months.len() / 2;
        let prior_avg: f64 =
            months[..mid].iter().map(|(_, t)| t).sum::<f64>() / mid as f64;
        let recent_avg: f64 =
            months[mid..].iter().map(|(_, t)| t).sum::<f64>() / (months.len() - mid) as f64;

        if prior_avg < 1.0 {
            continue;
        }
        let change_pct = (recent_avg - prior_avg) / prior_avg * 100.0;
        if change_pct.abs() > 15.0 {
            let trend = if change_pct > 15.0 {
                "increasing"
            } else {
                "decreasing"
            };
            category_creep.push(CategoryCreep {
                category: cat.clone(),
                trend: trend.to_string(),
                three_month_change_pct: change_pct,
                monthly_totals: months.iter().map(|(_, t)| *t).collect(),
                message: format!(
                    "{} spending {} {:.0}% over the last 3 months",
                    cat,
                    if change_pct > 0.0 { "up" } else { "down" },
                    change_pct.abs()
                ),
            });
        }
    }

    // Weekend splurge
    let weekend: (f64, f64) = sqlx::query_as(
        "WITH daily AS ( \
           SELECT date, SUM(amount::float8) as day_total, EXTRACT(DOW FROM date)::int as dow \
           FROM transactions WHERE date >= (CURRENT_DATE - interval '90 days') GROUP BY date \
         ) \
         SELECT \
           COALESCE(AVG(day_total) FILTER (WHERE dow IN (0, 6)), 0), \
           COALESCE(AVG(day_total) FILTER (WHERE dow NOT IN (0, 6)), 0) \
         FROM daily",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0, 0.0));

    let ratio = if weekend.1 > 0.0 { weekend.0 / weekend.1 } else { 1.0 };
    let wk_label = if ratio > 2.0 {
        "high"
    } else if ratio > 1.5 {
        "moderate"
    } else if ratio > 1.2 {
        "slight"
    } else {
        "balanced"
    };

    let weekend_splurge = WeekendSplurge {
        weekend_avg_daily: weekend.0,
        weekday_avg_daily: weekend.1,
        ratio,
        label: wk_label.to_string(),
        message: format!(
            "Weekend spending is {:.1}x weekday spending (${:.0} vs ${:.0} daily avg)",
            ratio, weekend.0, weekend.1
        ),
    };

    // Subscription bloat — reuse recurring logic inline
    let recurring_rows: Vec<(String, i32, i32, f64, f64, NaiveDate, NaiveDate)> = sqlx::query_as(
        "SELECT \
           COALESCE(merchant_normalized, description) as merchant, \
           COUNT(*)::int, COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int, \
           COALESCE(AVG(amount::float8), 0), COALESCE(STDDEV(amount::float8), 0), \
           MIN(date), MAX(date) \
         FROM transactions \
         GROUP BY COALESCE(merchant_normalized, description) \
         HAVING COUNT(DISTINCT to_char(date, 'YYYY-MM')) >= 3 \
         ORDER BY AVG(amount) DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let today = chrono::Local::now().naive_local().date();
    let mut sub_total = 0.0f64;
    let mut sub_count = 0i32;
    let mut forgotten = Vec::new();

    for (merchant, total_count, active_months, avg_amount, stddev, _first, last) in &recurring_rows
    {
        if avg_amount.abs() < 0.01 || *stddev > *avg_amount * 0.2 {
            continue;
        }
        let freq = *total_count as f64 / *active_months as f64;
        if freq < 0.7 || freq > 1.5 {
            continue;
        }
        let gap = today.signed_duration_since(*last).num_days();
        if gap <= 45 {
            sub_total += avg_amount;
            sub_count += 1;
        } else if *active_months >= 3 {
            forgotten.push(merchant.clone());
        }
    }

    let subscription_bloat = SubscriptionBloat {
        total_monthly: sub_total,
        total_annual: sub_total * 12.0,
        count: sub_count,
        potentially_forgotten: forgotten.clone(),
        message: format!(
            "{} active subscriptions totaling ${:.0}/month",
            sub_count, sub_total
        ),
    };

    // Merchant concentration
    let conc_rows: Vec<(String, f64, f64)> = sqlx::query_as(
        "WITH merchant_totals AS ( \
           SELECT COALESCE(merchant_normalized, description) as merchant, SUM(amount::float8) as total \
           FROM transactions WHERE date >= (CURRENT_DATE - interval '90 days') \
           GROUP BY COALESCE(merchant_normalized, description) \
         ), \
         with_share AS ( \
           SELECT merchant, total, total / NULLIF(SUM(total) OVER (), 0) as share \
           FROM merchant_totals \
         ) \
         SELECT merchant, total, COALESCE(share, 0) FROM with_share ORDER BY total DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let hhi: f64 = conc_rows.iter().map(|(_, _, s)| s * s).sum();
    let top_merchant = conc_rows.first().map(|(m, _, _)| m.clone()).unwrap_or_default();
    let top_merchant_pct = conc_rows.first().map(|(_, _, s)| s * 100.0).unwrap_or(0.0);
    let top_3_pct: f64 = conc_rows.iter().take(3).map(|(_, _, s)| s * 100.0).sum();

    let conc_label = if hhi > 0.25 {
        "high"
    } else if hhi > 0.15 {
        "moderate"
    } else if hhi > 0.10 {
        "mild"
    } else {
        "diversified"
    };

    let merchant_concentration = MerchantConcentration {
        top_merchant: top_merchant.clone(),
        top_merchant_pct,
        top_3_pct,
        hhi,
        label: conc_label.to_string(),
        message: format!(
            "Top merchant ({}) accounts for {:.0}% of spending",
            top_merchant, top_merchant_pct
        ),
    };

    Json(serde_json::json!({
        "data": HabitsData {
            impulse_spending,
            category_creep,
            weekend_splurge,
            subscription_bloat,
            merchant_concentration,
        }
    }))
}

// ── Daily Spending ──

#[derive(Deserialize)]
pub struct DailyQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

async fn get_daily(
    State(pool): State<PgPool>,
    Query(params): Query<DailyQuery>,
) -> Json<serde_json::Value> {
    let today = chrono::Local::now().naive_local().date();
    let start = params
        .start_date
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .unwrap_or(today - chrono::Duration::days(365));
    let end = params
        .end_date
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
        .unwrap_or(today);

    let rows: Vec<(NaiveDate, f64, i32)> = sqlx::query_as(
        "SELECT date, COALESCE(SUM(amount::float8), 0) as total, COUNT(*)::int as count \
         FROM transactions WHERE date >= $1 AND date <= $2 \
         GROUP BY date ORDER BY date",
    )
    .bind(start)
    .bind(end)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let data: Vec<DailySpending> = rows
        .into_iter()
        .map(|(date, total, count)| DailySpending { date, total, count })
        .collect();

    Json(serde_json::json!({ "data": data }))
}

// ── Category Deep Dive ──

async fn get_category_deep_dive(
    State(pool): State<PgPool>,
    axum::extract::Path(category): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    // Total and count
    let summary: (f64, i64, f64) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint, COALESCE(AVG(amount::float8), 0) \
         FROM transactions WHERE category = $1",
    )
    .bind(&category)
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0, 0, 0.0));

    // Monthly trend
    let monthly: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total, COUNT(*)::bigint as count \
         FROM transactions WHERE category = $1 \
         GROUP BY to_char(date, 'YYYY-MM') ORDER BY month",
    )
    .bind(&category)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Top merchants
    let merchants: Vec<(String, f64, i64, f64)> = sqlx::query_as(
        "SELECT COALESCE(merchant_normalized, description) as merchant, \
           SUM(amount::float8) as total, COUNT(*)::bigint as count, AVG(amount::float8) as avg_amount \
         FROM transactions WHERE category = $1 \
         GROUP BY COALESCE(merchant_normalized, description) \
         ORDER BY SUM(amount) DESC LIMIT 10",
    )
    .bind(&category)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Day of week
    let dow: Vec<(i32, f64, i64)> = sqlx::query_as(
        "SELECT EXTRACT(DOW FROM date)::int as dow, SUM(amount::float8) as total, COUNT(*)::bigint as count \
         FROM transactions WHERE category = $1 \
         GROUP BY EXTRACT(DOW FROM date) ORDER BY dow",
    )
    .bind(&category)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Recent transactions
    let recent: Vec<(uuid::Uuid, NaiveDate, String, f64)> = sqlx::query_as(
        "SELECT id, date, description, amount::float8 as amount \
         FROM transactions WHERE category = $1 \
         ORDER BY date DESC LIMIT 10",
    )
    .bind(&category)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    Json(serde_json::json!({
        "data": CategoryDeepDive {
            category: category.clone(),
            total_spent: summary.0,
            transaction_count: summary.1,
            avg_amount: summary.2,
            monthly_trend: monthly.iter().map(|(m, t, c)| {
                serde_json::json!({ "month": m, "total": t, "count": c })
            }).collect(),
            top_merchants: merchants.iter().map(|(m, t, c, a)| {
                CategoryMerchant { merchant: m.clone(), total: *t, count: *c, avg_amount: *a }
            }).collect(),
            day_of_week: dow.iter().map(|(d, t, c)| {
                serde_json::json!({
                    "day": day_names.get(*d as usize).unwrap_or(&"?"),
                    "day_num": d,
                    "total": t,
                    "count": c
                })
            }).collect(),
            recent_transactions: recent.iter().map(|(id, date, desc, amt)| {
                CategoryRecentTransaction {
                    id: *id,
                    date: *date,
                    description: desc.clone(),
                    amount: *amt,
                }
            }).collect(),
        }
    }))
}

// ── Smart Insights Engine ──

struct ScoredInsight {
    insight: Insight,
    priority: f64,
}

fn score_anomaly(z_score: f64) -> f64 {
    90.0 + (z_score.min(5.0) * 2.0)
}

fn score_trend(change_pct: f64) -> f64 {
    70.0 + (change_pct.abs().min(50.0) * 0.3)
}

async fn get_insights(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let mut scored: Vec<ScoredInsight> = Vec::new();

    // 1. Anomaly insights
    let baselines: Vec<(String, f64, f64, i32)> = sqlx::query_as(
        "WITH monthly_cat AS ( \
           SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total \
           FROM transactions GROUP BY category, to_char(date, 'YYYY-MM') \
         ) \
         SELECT category, AVG(total)::float8, COALESCE(STDDEV(total), 0)::float8, COUNT(*)::int \
         FROM monthly_cat GROUP BY category HAVING COUNT(*) >= 2",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let current_cat: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date GROUP BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let current_map: HashMap<String, f64> = current_cat.into_iter().collect();

    for (category, avg, stddev, _) in &baselines {
        if *stddev < 0.01 {
            continue;
        }
        let current = current_map.get(category).copied().unwrap_or(0.0);
        let z = (current - avg) / stddev;
        if z > 2.0 {
            let pct = (current - avg) / avg * 100.0;
            scored.push(ScoredInsight {
                priority: score_anomaly(z),
                insight: Insight {
                    r#type: "anomaly".into(),
                    severity: if z > 3.0 { "high" } else { "medium" }.into(),
                    icon: "AlertTriangle".into(),
                    title: format!("{} spending spike", category),
                    message: format!(
                        "{} spending is {:.0}% above your average this month",
                        category, pct
                    ),
                    metric: Some(serde_json::json!({ "z_score": z, "pct_above": pct })),
                    action: Some(format!("Review your {} transactions", category)),
                    category: Some(category.clone()),
                },
            });
        }
    }

    // 2. MoM trend
    let this_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let last_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date \
         AND date < date_trunc('month', CURRENT_DATE)::date",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    if last_month.0 > 0.0 {
        let mom_pct = (this_month.0 - last_month.0) / last_month.0 * 100.0;
        if mom_pct.abs() > 20.0 {
            let (title, msg, severity) = if mom_pct > 0.0 {
                (
                    "Spending up vs last month".into(),
                    format!("You've spent {:.0}% more than last month so far", mom_pct),
                    "medium",
                )
            } else {
                (
                    "Spending down vs last month".into(),
                    format!(
                        "You've spent {:.0}% less than last month so far",
                        mom_pct.abs()
                    ),
                    "low",
                )
            };
            scored.push(ScoredInsight {
                priority: score_trend(mom_pct),
                insight: Insight {
                    r#type: "trend".into(),
                    severity: severity.into(),
                    icon: if mom_pct > 0.0 {
                        "TrendingUp"
                    } else {
                        "TrendingDown"
                    }
                    .into(),
                    title,
                    message: msg,
                    metric: Some(serde_json::json!({ "mom_change_pct": mom_pct })),
                    action: None,
                    category: None,
                },
            });
        }
    }

    // 3. Forecast insight
    let now = chrono::Local::now().naive_local().date();
    let d_elapsed = now.day();
    let d_in_month = days_in_month(now.year(), now.month());
    let projected = linear_projection(this_month.0, d_elapsed, d_in_month);

    let avg_monthly: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) / \
         GREATEST(COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1) FROM transactions",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    if avg_monthly.0 > 0.0 {
        let vs_avg_pct = (projected - avg_monthly.0) / avg_monthly.0 * 100.0;
        if vs_avg_pct > 15.0 {
            scored.push(ScoredInsight {
                priority: 60.0 + vs_avg_pct.min(40.0) * 0.375,
                insight: Insight {
                    r#type: "forecast".into(),
                    severity: if vs_avg_pct > 30.0 { "high" } else { "medium" }.into(),
                    icon: "Activity".into(),
                    title: "On track to overspend".into(),
                    message: format!(
                        "Projected spending is {:.0}% above your monthly average",
                        vs_avg_pct
                    ),
                    metric: Some(serde_json::json!({
                        "projected": projected,
                        "avg_monthly": avg_monthly.0,
                        "vs_avg_pct": vs_avg_pct
                    })),
                    action: Some("Consider reducing discretionary spending".into()),
                    category: None,
                },
            });
        }
    }

    // 4. Habit insights
    let impulse: (i32, i32, f64, f64) = sqlx::query_as(
        "SELECT COUNT(*)::int, \
           COUNT(*) FILTER (WHERE amount::float8 < 15)::int, \
           COALESCE(SUM(amount::float8) FILTER (WHERE amount::float8 < 15), 0), \
           COALESCE(AVG(amount::float8) FILTER (WHERE amount::float8 < 15), 0) \
         FROM transactions WHERE date >= (CURRENT_DATE - interval '90 days')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0, 0, 0.0, 0.0));

    if impulse.0 > 0 {
        let small_pct = impulse.1 as f64 / impulse.0 as f64 * 100.0;
        if small_pct > 35.0 {
            scored.push(ScoredInsight {
                priority: 45.0 + small_pct * 0.3,
                insight: Insight {
                    r#type: "habit".into(),
                    severity: "medium".into(),
                    icon: "Coffee".into(),
                    title: "Frequent small purchases".into(),
                    message: format!(
                        "{:.0}% of your transactions are under $15 — totaling ${:.0}/month",
                        small_pct,
                        impulse.2 / 3.0
                    ),
                    metric: Some(serde_json::json!({ "small_pct": small_pct })),
                    action: Some("Track small daily expenses".into()),
                    category: None,
                },
            });
        }
    }

    // Category creep insight
    let cat_monthly: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) \
         FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '6 months')::date \
         GROUP BY category, to_char(date, 'YYYY-MM') ORDER BY category, month",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut cat_map: HashMap<String, Vec<f64>> = HashMap::new();
    for (cat, _, total) in &cat_monthly {
        cat_map.entry(cat.clone()).or_default().push(*total);
    }
    for (cat, months) in &cat_map {
        if months.len() < 4 {
            continue;
        }
        let mid = months.len() / 2;
        let prior: f64 = months[..mid].iter().sum::<f64>() / mid as f64;
        let recent: f64 = months[mid..].iter().sum::<f64>() / (months.len() - mid) as f64;
        if prior < 1.0 {
            continue;
        }
        let change = (recent - prior) / prior * 100.0;
        if change > 25.0 {
            scored.push(ScoredInsight {
                priority: 50.0 + change.min(50.0) * 0.2,
                insight: Insight {
                    r#type: "habit".into(),
                    severity: "medium".into(),
                    icon: "TrendingUp".into(),
                    title: format!("{} spending creeping up", cat),
                    message: format!("{} spending up {:.0}% over the last 3 months", cat, change),
                    metric: Some(serde_json::json!({ "change_pct": change })),
                    action: Some(format!("Set a {} budget", cat)),
                    category: Some(cat.clone()),
                },
            });
        }
    }

    // Weekend splurge
    let weekend: (f64, f64) = sqlx::query_as(
        "WITH daily AS ( \
           SELECT date, SUM(amount::float8) as day_total, EXTRACT(DOW FROM date)::int as dow \
           FROM transactions WHERE date >= (CURRENT_DATE - interval '90 days') GROUP BY date \
         ) \
         SELECT \
           COALESCE(AVG(day_total) FILTER (WHERE dow IN (0, 6)), 0), \
           COALESCE(AVG(day_total) FILTER (WHERE dow NOT IN (0, 6)), 0) \
         FROM daily",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0, 0.0));

    if weekend.1 > 0.0 {
        let ratio = weekend.0 / weekend.1;
        if ratio > 1.5 {
            scored.push(ScoredInsight {
                priority: 40.0 + (ratio - 1.0).min(2.0) * 10.0,
                insight: Insight {
                    r#type: "habit".into(),
                    severity: "low".into(),
                    icon: "Calendar".into(),
                    title: "Weekend spending spike".into(),
                    message: format!(
                        "You spend {:.1}x more on weekends than weekdays",
                        ratio
                    ),
                    metric: Some(serde_json::json!({ "ratio": ratio })),
                    action: Some("Plan weekend activities with a budget".into()),
                    category: None,
                },
            });
        }
    }

    // 5. Recurring insights
    let recurring_rows: Vec<(String, i32, i32, f64, f64, NaiveDate, NaiveDate)> = sqlx::query_as(
        "SELECT \
           COALESCE(merchant_normalized, description), \
           COUNT(*)::int, COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int, \
           COALESCE(AVG(amount::float8), 0), COALESCE(STDDEV(amount::float8), 0), \
           MIN(date), MAX(date) \
         FROM transactions \
         GROUP BY COALESCE(merchant_normalized, description) \
         HAVING COUNT(DISTINCT to_char(date, 'YYYY-MM')) >= 3",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let today = chrono::Local::now().naive_local().date();
    let mut recurring_total = 0.0f64;
    let mut forgotten_subs = Vec::new();

    for (merchant, total_count, active_months, avg_amount, stddev, _first, last) in &recurring_rows
    {
        if avg_amount.abs() < 0.01 || *stddev > *avg_amount * 0.2 {
            continue;
        }
        let freq = *total_count as f64 / *active_months as f64;
        if freq < 0.7 || freq > 1.5 {
            continue;
        }
        let gap = today.signed_duration_since(*last).num_days();
        if gap <= 45 {
            recurring_total += avg_amount;
        } else if *active_months >= 3 {
            forgotten_subs.push(merchant.clone());
        }
    }

    if !forgotten_subs.is_empty() {
        scored.push(ScoredInsight {
            priority: 55.0 + forgotten_subs.len() as f64 * 5.0,
            insight: Insight {
                r#type: "recurring".into(),
                severity: "medium".into(),
                icon: "AlertCircle".into(),
                title: "Potentially forgotten subscriptions".into(),
                message: format!(
                    "{} subscriptions haven't been charged recently: {}",
                    forgotten_subs.len(),
                    forgotten_subs.join(", ")
                ),
                metric: Some(serde_json::json!({ "count": forgotten_subs.len() })),
                action: Some("Check if these subscriptions are still needed".into()),
                category: None,
            },
        });
    }

    if recurring_total > 100.0 {
        scored.push(ScoredInsight {
            priority: 50.0,
            insight: Insight {
                r#type: "recurring".into(),
                severity: "low".into(),
                icon: "Repeat".into(),
                title: "Monthly recurring summary".into(),
                message: format!(
                    "Your recurring charges total ${:.0}/month (${:.0}/year)",
                    recurring_total,
                    recurring_total * 12.0
                ),
                metric: Some(serde_json::json!({
                    "monthly": recurring_total,
                    "annual": recurring_total * 12.0
                })),
                action: None,
                category: None,
            },
        });
    }

    // 6. Positive insights
    if avg_monthly.0 > 0.0 && this_month.0 < avg_monthly.0 * 0.9 {
        scored.push(ScoredInsight {
            priority: 25.0,
            insight: Insight {
                r#type: "positive".into(),
                severity: "low".into(),
                icon: "ThumbsUp".into(),
                title: "Great month so far!".into(),
                message: format!(
                    "You're spending {:.0}% below your monthly average",
                    (1.0 - this_month.0 / avg_monthly.0) * 100.0
                ),
                metric: None,
                action: None,
                category: None,
            },
        });
    }

    // Sort by priority descending, take top 8
    scored.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap_or(std::cmp::Ordering::Equal));
    let insights: Vec<Insight> = scored.into_iter().take(8).map(|s| s.insight).collect();

    Json(serde_json::json!({ "data": insights }))
}
