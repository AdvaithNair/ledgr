use axum::{
    extract::State,
    routing::{delete, get},
    Json, Router,
};
use chrono::Datelike;
use sqlx::PgPool;

use crate::models::budget::{Budget, BudgetProgress, NewBudget};

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/budgets", get(list_budgets).post(upsert_budget))
        .route("/budgets/progress", get(budget_progress))
        .route("/budgets/:id", delete(delete_budget))
}

async fn list_budgets(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let budgets: Vec<Budget> = sqlx::query_as(
        "SELECT id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at \
         FROM budgets ORDER BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({ "data": budgets }))
}

async fn upsert_budget(
    State(pool): State<PgPool>,
    Json(body): Json<NewBudget>,
) -> Json<serde_json::Value> {
    let result = sqlx::query_as::<_, Budget>(
        "INSERT INTO budgets (category, monthly_limit) \
         VALUES ($1, $2) \
         ON CONFLICT (category) DO UPDATE SET \
           monthly_limit = EXCLUDED.monthly_limit, \
           updated_at = NOW() \
         RETURNING id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at",
    )
    .bind(&body.category)
    .bind(body.monthly_limit)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(budget) => Json(serde_json::json!({ "data": budget })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}

async fn delete_budget(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<uuid::Uuid>,
) -> Json<serde_json::Value> {
    sqlx::query("DELETE FROM budgets WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .ok();

    Json(serde_json::json!({ "data": "Budget deleted" }))
}

async fn budget_progress(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let budgets: Vec<Budget> = sqlx::query_as(
        "SELECT id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at \
         FROM budgets ORDER BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    if budgets.is_empty() {
        return Json(serde_json::json!({ "data": [] }));
    }

    let spending: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) \
         FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date \
         GROUP BY category",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let spending_map: std::collections::HashMap<String, f64> = spending.into_iter().collect();

    let now = chrono::Local::now().naive_local().date();
    let days_elapsed = now.day();
    let days_in_month = if now.month() == 12 {
        chrono::NaiveDate::from_ymd_opt(now.year() + 1, 1, 1)
    } else {
        chrono::NaiveDate::from_ymd_opt(now.year(), now.month() + 1, 1)
    }
    .unwrap()
    .signed_duration_since(chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap())
    .num_days() as u32;
    let days_remaining = days_in_month.saturating_sub(days_elapsed);

    let progress: Vec<BudgetProgress> = budgets
        .iter()
        .map(|b| {
            let spent = spending_map.get(&b.category).copied().unwrap_or(0.0);
            let remaining = (b.monthly_limit - spent).max(0.0);
            let pct_used = if b.monthly_limit > 0.0 {
                (spent / b.monthly_limit) * 100.0
            } else {
                0.0
            };

            let projected_spend = if days_elapsed > 0 {
                (spent / days_elapsed as f64) * days_in_month as f64
            } else {
                0.0
            };
            let projected_pct = if b.monthly_limit > 0.0 {
                (projected_spend / b.monthly_limit) * 100.0
            } else {
                0.0
            };

            let status = if pct_used >= 100.0 {
                "over_budget".to_string()
            } else if projected_pct >= 90.0 {
                "warning".to_string()
            } else {
                "on_track".to_string()
            };

            BudgetProgress {
                category: b.category.clone(),
                monthly_limit: b.monthly_limit,
                spent,
                remaining,
                pct_used,
                projected_spend,
                projected_pct,
                status,
                days_remaining,
            }
        })
        .collect();

    Json(serde_json::json!({ "data": progress }))
}
