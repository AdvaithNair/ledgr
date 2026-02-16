use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ImportRecord {
    pub id: Uuid,
    pub imported_at: chrono::DateTime<chrono::Utc>,
    pub card: String,
    pub file_name: String,
    pub transaction_count: i32,
    pub duplicate_count: i32,
    pub skipped_user_count: i32,
}
