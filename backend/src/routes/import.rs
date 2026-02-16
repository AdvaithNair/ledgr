use axum::{
    extract::{Multipart, State},
    routing::{get, post},
    Json, Router,
};
use sqlx::PgPool;

use crate::models::import::ImportRecord;
use crate::services::{csv_parser, dedup};

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/transactions/import", post(import_csv))
        .route("/import-history", get(get_import_history))
        .route("/stats/summary", get(get_summary))
        .route("/stats/monthly", get(get_monthly))
        .route("/stats/merchants", get(get_merchants))
        .route("/stats/patterns", get(get_patterns))
}

async fn import_csv(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let mut file_name = String::from("upload.csv");
    let mut csv_data = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        if let Some(name) = field.file_name() {
            file_name = name.to_string();
        }
        if let Ok(text) = field.text().await {
            csv_data = text;
        }
    }

    if csv_data.is_empty() {
        return Json(serde_json::json!({ "error": "No CSV data received" }));
    }

    let (card_type, transactions) = match csv_parser::parse_csv(&csv_data) {
        Ok(result) => result,
        Err(e) => return Json(serde_json::json!({ "error": e })),
    };

    let existing_hashes = dedup::get_existing_hashes(&pool).await;

    let mut new_count = 0i32;
    let mut dup_count = 0i32;

    for txn in &transactions {
        if existing_hashes.contains(&txn.hash) {
            dup_count += 1;
            continue;
        }

        let result = sqlx::query(
            "INSERT INTO transactions (date, description, amount, category, card, card_label, raw_data, hash) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
        )
        .bind(txn.date)
        .bind(&txn.description)
        .bind(txn.amount)
        .bind(&txn.category)
        .bind(&txn.card)
        .bind(&txn.card_label)
        .bind(&txn.raw_data)
        .bind(&txn.hash)
        .execute(&pool)
        .await;

        match result {
            Ok(_) => new_count += 1,
            Err(e) => tracing::warn!("Failed to insert transaction: {}", e),
        }
    }

    // Record import history
    sqlx::query(
        "INSERT INTO import_history (card, file_name, transaction_count, duplicate_count) \
         VALUES ($1, $2, $3, $4)"
    )
    .bind(card_type.code())
    .bind(&file_name)
    .bind(new_count)
    .bind(dup_count)
    .execute(&pool)
    .await
    .ok();

    Json(serde_json::json!({
        "data": {
            "card": card_type.code(),
            "card_label": card_type.label(),
            "file_name": file_name,
            "new_count": new_count,
            "duplicate_count": dup_count,
            "total_parsed": transactions.len()
        }
    }))
}

async fn get_import_history(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let records: Vec<ImportRecord> = sqlx::query_as(
        "SELECT * FROM import_history ORDER BY imported_at DESC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({ "data": records }))
}

async fn get_summary(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let total: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)::bigint FROM transactions"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));

    // By card
    let by_card: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT card, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY card ORDER BY SUM(amount) DESC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // By category
    let by_category: Vec<(String, f64, i64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY category ORDER BY SUM(amount) DESC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // This month
    let this_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0.0,));

    // Last month
    let last_month: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(amount::float8), 0) FROM transactions \
         WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date \
         AND date < date_trunc('month', CURRENT_DATE)::date"
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
         FROM transactions GROUP BY to_char(date, 'YYYY-MM') ORDER BY month"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Monthly by card
    let monthly_by_card: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, card, COALESCE(SUM(amount::float8), 0) \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM'), card ORDER BY month"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Monthly by category
    let monthly_by_category: Vec<(String, String, f64)> = sqlx::query_as(
        "SELECT to_char(date, 'YYYY-MM') as month, category, COALESCE(SUM(amount::float8), 0) \
         FROM transactions GROUP BY to_char(date, 'YYYY-MM'), category ORDER BY month"
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
         FROM transactions GROUP BY description ORDER BY SUM(amount) DESC LIMIT 20"
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
    // Day of week
    let day_of_week: Vec<(f64, f64, i64)> = sqlx::query_as(
        "SELECT EXTRACT(DOW FROM date)::float8, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY EXTRACT(DOW FROM date) ORDER BY EXTRACT(DOW FROM date)"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Day of month
    let day_of_month: Vec<(f64, f64, i64)> = sqlx::query_as(
        "SELECT EXTRACT(DAY FROM date)::float8, COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint \
         FROM transactions GROUP BY EXTRACT(DAY FROM date) ORDER BY EXTRACT(DAY FROM date)"
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
