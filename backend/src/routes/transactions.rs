use axum::{
    extract::{Multipart, Path, Query, State},
    routing::{get, patch, post},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::card::Card;
use crate::models::transaction::{BulkCategoryUpdate, CategoryUpdate, TransactionQuery};
use crate::services::{csv_parser, dedup};

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/transactions", get(list_transactions).delete(delete_all))
        .route("/transactions/import", post(import_csv))
        .route("/transactions/bulk-category", patch(bulk_update_category))
        .route("/transactions/:id", patch(update_category))
}

async fn list_transactions(
    State(pool): State<PgPool>,
    Query(params): Query<TransactionQuery>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(50).min(200);
    let offset = (page - 1) * per_page;

    let sort_col = match params.sort_by.as_deref() {
        Some("date") => "date",
        Some("amount") => "amount",
        Some("description") => "description",
        Some("category") => "category",
        Some("card") => "card",
        _ => "date",
    };
    let sort_dir = match params.sort_order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    let mut conditions: Vec<String> = Vec::new();
    let mut bind_idx = 1u32;

    if params.card.is_some() {
        conditions.push(format!("card = ANY(string_to_array(${}, ','))", bind_idx));
        bind_idx += 1;
    }
    if params.category.is_some() {
        conditions.push(format!("category = ${}", bind_idx));
        bind_idx += 1;
    }
    if params.start_date.is_some() {
        conditions.push(format!("date >= ${}", bind_idx));
        bind_idx += 1;
    }
    if params.end_date.is_some() {
        conditions.push(format!("date <= ${}", bind_idx));
        bind_idx += 1;
    }
    if params.search.is_some() {
        conditions.push(format!("LOWER(description) LIKE ${}", bind_idx));
        bind_idx += 1;
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let data_sql = format!(
        "SELECT id, date, description, amount::float8 as amount, category, card, card_label, raw_data, hash, created_at \
         FROM transactions {} ORDER BY {} {} LIMIT ${} OFFSET ${}",
        where_clause, sort_col, sort_dir, bind_idx, bind_idx + 1
    );
    let count_sql = format!(
        "SELECT COUNT(*)::bigint FROM transactions {}",
        where_clause
    );

    // Build data query
    let mut data_query = sqlx::query_as::<_, crate::models::transaction::Transaction>(&data_sql);
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);

    if let Some(ref card) = params.card {
        data_query = data_query.bind(card);
        count_query = count_query.bind(card);
    }
    if let Some(ref category) = params.category {
        data_query = data_query.bind(category);
        count_query = count_query.bind(category);
    }
    if let Some(ref start_date) = params.start_date {
        data_query = data_query.bind(start_date);
        count_query = count_query.bind(start_date);
    }
    if let Some(ref end_date) = params.end_date {
        data_query = data_query.bind(end_date);
        count_query = count_query.bind(end_date);
    }
    if let Some(ref search) = params.search {
        let pattern = format!("%{}%", search.to_lowercase());
        data_query = data_query.bind(pattern.clone());
        count_query = count_query.bind(pattern);
    }

    data_query = data_query.bind(per_page).bind(offset);

    let rows = data_query.fetch_all(&pool).await.unwrap_or_default();
    let total: i64 = count_query.fetch_one(&pool).await.unwrap_or(0);

    Json(serde_json::json!({
        "data": rows,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": ((total as f64) / (per_page as f64)).ceil() as i64
        }
    }))
}

async fn import_csv(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let mut file_name = String::from("upload.csv");
    let mut csv_data = String::new();
    let mut card_code: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                if let Some(fname) = field.file_name() {
                    file_name = fname.to_string();
                }
                if let Ok(text) = field.text().await {
                    csv_data = text;
                }
            }
            "card_code" => {
                if let Ok(text) = field.text().await {
                    if !text.is_empty() {
                        card_code = Some(text);
                    }
                }
            }
            _ => {
                let _ = field.text().await;
            }
        }
    }

    if csv_data.is_empty() {
        return Json(serde_json::json!({ "error": "No CSV data received" }));
    }

    let all_cards: Vec<Card> = sqlx::query_as("SELECT * FROM cards ORDER BY created_at ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let card = if let Some(ref code) = card_code {
        match all_cards.iter().find(|c| c.code == *code) {
            Some(c) => c.clone(),
            None => {
                return Json(serde_json::json!({ "error": format!("Unknown card code: {}", code) }));
            }
        }
    } else {
        let first_line = csv_data.lines().next().unwrap_or("");
        let headers_str = first_line.to_lowercase();
        match csv_parser::detect_card(&headers_str, &all_cards) {
            Some(c) => c.clone(),
            None => {
                return Json(serde_json::json!({
                    "error": "Could not auto-detect card type from CSV headers. Please select a card."
                }));
            }
        }
    };

    let user_name: Option<String> = sqlx::query_scalar(
        "SELECT value FROM user_config WHERE key = 'user_name'",
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let parse_result = match csv_parser::parse_csv(&csv_data, &card, user_name.as_deref()) {
        Ok(r) => r,
        Err(e) => return Json(serde_json::json!({ "error": e })),
    };

    let existing_hashes = dedup::get_existing_hashes(&pool).await;

    let mut new_count = 0i32;
    let mut dup_count = 0i32;
    let total_parsed = parse_result.transactions.len() + parse_result.skipped_user_count;

    for txn in &parse_result.transactions {
        if existing_hashes.contains(&txn.hash) {
            dup_count += 1;
            continue;
        }

        let result = sqlx::query(
            "INSERT INTO transactions (date, description, amount, category, card, card_label, raw_data, hash) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
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

    sqlx::query(
        "INSERT INTO import_history (card, file_name, transaction_count, duplicate_count, skipped_user_count) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(&card.code)
    .bind(&file_name)
    .bind(new_count)
    .bind(dup_count)
    .bind(parse_result.skipped_user_count as i32)
    .execute(&pool)
    .await
    .ok();

    Json(serde_json::json!({
        "data": {
            "card": card.code,
            "card_label": card.label,
            "file_name": file_name,
            "new_count": new_count,
            "duplicate_count": dup_count,
            "skipped_user_count": parse_result.skipped_user_count,
            "total_parsed": total_parsed
        }
    }))
}

async fn delete_all(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    sqlx::query("DELETE FROM transactions")
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM import_history")
        .execute(&pool)
        .await
        .ok();
    Json(serde_json::json!({ "data": "All transactions deleted" }))
}

async fn update_category(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<CategoryUpdate>,
) -> Json<serde_json::Value> {
    let result = sqlx::query("UPDATE transactions SET category = $1 WHERE id = $2")
        .bind(&body.category)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(_) => Json(serde_json::json!({ "data": "Category updated" })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}

async fn bulk_update_category(
    State(pool): State<PgPool>,
    Json(body): Json<BulkCategoryUpdate>,
) -> Json<serde_json::Value> {
    let result = sqlx::query("UPDATE transactions SET category = $1 WHERE id = ANY($2)")
        .bind(&body.category)
        .bind(&body.ids)
        .execute(&pool)
        .await;

    match result {
        Ok(r) => Json(serde_json::json!({
            "data": format!("{} transactions updated", r.rows_affected())
        })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}
