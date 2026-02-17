use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::card::{NewCard, UpdateCard};

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/cards", get(list_cards).post(create_card))
        .route("/cards/:id", get(get_card).put(update_card).delete(delete_card))
}

async fn list_cards(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let cards: Vec<crate::models::card::Card> = sqlx::query_as(
        "SELECT * FROM cards ORDER BY created_at ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({ "data": cards }))
}

async fn get_card(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let card: Option<crate::models::card::Card> = sqlx::query_as(
        "SELECT * FROM cards WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    match card {
        Some(c) => Json(serde_json::json!({ "data": c })),
        None => Json(serde_json::json!({ "error": "Card not found" })),
    }
}

async fn create_card(
    State(pool): State<PgPool>,
    Json(body): Json<NewCard>,
) -> Json<serde_json::Value> {
    if body.code.is_empty() || body.label.is_empty() {
        return Json(serde_json::json!({ "error": "code and label are required" }));
    }

    let result: Result<crate::models::card::Card, _> = sqlx::query_as(
        "INSERT INTO cards (code, label, color, header_pattern, delimiter, date_column, date_format, \
         description_column, amount_column, debit_column, credit_column, category_column, \
         member_column, skip_negative_amounts) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) \
         RETURNING *",
    )
    .bind(&body.code)
    .bind(&body.label)
    .bind(&body.color)
    .bind(&body.header_pattern)
    .bind(body.delimiter.as_deref().unwrap_or(","))
    .bind(&body.date_column)
    .bind(&body.date_format)
    .bind(&body.description_column)
    .bind(&body.amount_column)
    .bind(&body.debit_column)
    .bind(&body.credit_column)
    .bind(&body.category_column)
    .bind(&body.member_column)
    .bind(body.skip_negative_amounts.unwrap_or(false))
    .fetch_one(&pool)
    .await;

    match result {
        Ok(card) => Json(serde_json::json!({ "data": card })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}

async fn update_card(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCard>,
) -> Json<serde_json::Value> {
    // Fetch existing card, merge with partial update fields
    let existing: Option<crate::models::card::Card> = sqlx::query_as(
        "SELECT * FROM cards WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let existing = match existing {
        Some(c) => c,
        None => return Json(serde_json::json!({ "error": "Card not found" })),
    };

    let code = body.code.unwrap_or(existing.code);
    let label = body.label.unwrap_or(existing.label);
    let color = body.color.unwrap_or(existing.color);
    let header_pattern = body.header_pattern.or(existing.header_pattern);
    let delimiter = body.delimiter.unwrap_or(existing.delimiter);
    let date_column = body.date_column.or(existing.date_column);
    let date_format = body.date_format.or(existing.date_format);
    let description_column = body.description_column.or(existing.description_column);
    let amount_column = body.amount_column.or(existing.amount_column);
    let debit_column = body.debit_column.or(existing.debit_column);
    let credit_column = body.credit_column.or(existing.credit_column);
    let category_column = body.category_column.or(existing.category_column);
    let member_column = body.member_column.or(existing.member_column);
    let skip_negative_amounts = body.skip_negative_amounts.unwrap_or(existing.skip_negative_amounts);

    let result: Result<crate::models::card::Card, _> = sqlx::query_as(
        "UPDATE cards SET code=$1, label=$2, color=$3, header_pattern=$4, delimiter=$5, \
         date_column=$6, date_format=$7, description_column=$8, amount_column=$9, \
         debit_column=$10, credit_column=$11, category_column=$12, member_column=$13, \
         skip_negative_amounts=$14 WHERE id=$15 RETURNING *",
    )
    .bind(&code)
    .bind(&label)
    .bind(&color)
    .bind(&header_pattern)
    .bind(&delimiter)
    .bind(&date_column)
    .bind(&date_format)
    .bind(&description_column)
    .bind(&amount_column)
    .bind(&debit_column)
    .bind(&credit_column)
    .bind(&category_column)
    .bind(&member_column)
    .bind(skip_negative_amounts)
    .bind(id)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(card) => Json(serde_json::json!({ "data": card })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}

async fn delete_card(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query("DELETE FROM cards WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(serde_json::json!({ "data": "Card deleted" }))
        }
        Ok(_) => Json(serde_json::json!({ "error": "Card not found" })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}
