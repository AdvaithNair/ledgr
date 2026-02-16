use axum::{
    extract::{Path, Query, State},
    routing::{get, patch},
    Json, Router,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::transaction::{BulkCategoryUpdate, CategoryUpdate, TransactionQuery};

pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/transactions", get(list_transactions).delete(delete_all))
        .route("/transactions/{id}", patch(update_category))
        .route("/transactions/bulk-category", patch(bulk_update_category))
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
