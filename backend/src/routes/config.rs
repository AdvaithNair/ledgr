use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use sqlx::PgPool;
use std::collections::HashMap;

use crate::models::config::UserConfig;

pub fn routes() -> Router<PgPool> {
    Router::new().route("/config", get(get_config).put(set_config))
}

async fn get_config(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let rows: Vec<UserConfig> = sqlx::query_as("SELECT * FROM user_config")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let config: HashMap<String, String> = rows.into_iter().map(|r| (r.key, r.value)).collect();

    Json(serde_json::json!({ "data": config }))
}

async fn set_config(
    State(pool): State<PgPool>,
    Json(body): Json<HashMap<String, String>>,
) -> Json<serde_json::Value> {
    for (key, value) in &body {
        let result = sqlx::query(
            "INSERT INTO user_config (key, value, updated_at) VALUES ($1, $2, NOW()) \
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
        )
        .bind(key)
        .bind(value)
        .execute(&pool)
        .await;

        if let Err(e) = result {
            return Json(serde_json::json!({ "error": e.to_string() }));
        }
    }

    Json(serde_json::json!({ "data": "Config updated" }))
}
