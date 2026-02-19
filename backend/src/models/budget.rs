use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Budget {
    pub id: Uuid,
    pub category: String,
    pub monthly_limit: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NewBudget {
    pub category: String,
    pub monthly_limit: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBudget {
    pub monthly_limit: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct BudgetProgress {
    pub category: String,
    pub monthly_limit: f64,
    pub spent: f64,
    pub remaining: f64,
    pub pct_used: f64,
    pub projected_spend: f64,
    pub projected_pct: f64,
    pub status: String,
    pub days_remaining: u32,
}
