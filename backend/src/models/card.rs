use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Card {
    pub id: Uuid,
    pub code: String,
    pub label: String,
    pub color: String,
    pub header_pattern: Option<String>,
    pub delimiter: String,
    pub date_column: Option<String>,
    pub date_format: Option<String>,
    pub description_column: Option<String>,
    pub amount_column: Option<String>,
    pub debit_column: Option<String>,
    pub credit_column: Option<String>,
    pub category_column: Option<String>,
    pub member_column: Option<String>,
    pub skip_negative_amounts: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NewCard {
    pub code: String,
    pub label: String,
    pub color: String,
    pub header_pattern: Option<String>,
    pub delimiter: Option<String>,
    pub date_column: Option<String>,
    pub date_format: Option<String>,
    pub description_column: Option<String>,
    pub amount_column: Option<String>,
    pub debit_column: Option<String>,
    pub credit_column: Option<String>,
    pub category_column: Option<String>,
    pub member_column: Option<String>,
    pub skip_negative_amounts: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCard {
    pub code: Option<String>,
    pub label: Option<String>,
    pub color: Option<String>,
    pub header_pattern: Option<String>,
    pub delimiter: Option<String>,
    pub date_column: Option<String>,
    pub date_format: Option<String>,
    pub description_column: Option<String>,
    pub amount_column: Option<String>,
    pub debit_column: Option<String>,
    pub credit_column: Option<String>,
    pub category_column: Option<String>,
    pub member_column: Option<String>,
    pub skip_negative_amounts: Option<bool>,
}
