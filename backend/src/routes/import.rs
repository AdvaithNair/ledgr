use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use sqlx::PgPool;

use crate::models::import::ImportRecord;

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/import-history", get(get_import_history))
        .route("/stats/summary", get(get_summary))
        .route("/stats/monthly", get(get_monthly))
        .route("/stats/merchants", get(get_merchants))
        .route("/stats/patterns", get(get_patterns))
}

async fn get_import_history(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let records: Vec<ImportRecord> =
        sqlx::query_as("SELECT * FROM import_history ORDER BY imported_at DESC")
            .fetch_all(&pool)
            .await
            .unwrap_or_default();

    Json(serde_json::json!({ "data": records }))
}

async fn get_summary(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let total: (f64,) =
        sqlx::query_as("SELECT COALESCE(SUM(amount::float8), 0) FROM transactions")
            .fetch_one(&pool)
            .await
            .unwrap_or((0.0,));

    let count: (i64,) =
        sqlx::query_as("SELECT COUNT(*)::bigint FROM transactions")
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

    Json(serde_json::json!({
        "data": {
            "total_spent": total.0,
            "transaction_count": count.0,
            "this_month": this_month.0,
            "last_month": last_month.0,
            "by_card": by_card.iter().map(|(card, total, count)| {
                serde_json::json!({ "card": card, "total": total, "count": count })
            }).collect::<Vec<_>>(),
            "by_category": by_category.iter().map(|(cat, total, count)| {
                serde_json::json!({ "category": cat, "total": total, "count": count })
            }).collect::<Vec<_>>()
        }
    }))
}

async fn get_monthly(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let monthly: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM') ORDER BY month",
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
            "monthly": monthly.iter().map(|(m, total, count)| {
                serde_json::json!({ "month": m, "total": total, "count": count })
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

async fn get_merchants(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let merchants: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT description, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY description ORDER BY SUM(amount) DESC LIMIT 20",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({
        "data": merchants.iter().map(|(desc, total, count)| {
            serde_json::json!({ "merchant": desc, "total": total, "count": count })
        }).collect::<Vec<_>>()
    }))
}

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
