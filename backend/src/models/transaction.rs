use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub card: String,
    pub card_label: String,
    pub raw_data: Option<serde_json::Value>,
    pub hash: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewTransaction {
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub card: String,
    pub card_label: String,
    pub raw_data: Option<serde_json::Value>,
    pub hash: String,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub card: Option<String>,
    pub category: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CategoryUpdate {
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkCategoryUpdate {
    pub ids: Vec<Uuid>,
    pub category: String,
}
