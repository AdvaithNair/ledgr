use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserConfig {
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}
