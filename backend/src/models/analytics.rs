use chrono::NaiveDate;
use serde::Serialize;

// ── Recurring ──

#[derive(Debug, Serialize)]
pub struct RecurringTransaction {
    pub merchant: String,
    pub avg_amount: f64,
    pub frequency: String,
    pub active_months: i32,
    pub first_seen: NaiveDate,
    pub last_seen: NaiveDate,
    pub estimated_annual: f64,
    pub status: String,
    pub last_gap_days: i64,
    pub potentially_forgotten: bool,
}

#[derive(Debug, Serialize)]
pub struct RecurringData {
    pub recurring: Vec<RecurringTransaction>,
    pub total_monthly_recurring: f64,
    pub total_annual_recurring: f64,
}

// ── Anomalies ──

#[derive(Debug, Serialize)]
pub struct CategoryAnomaly {
    pub category: String,
    pub current_month: f64,
    pub avg_monthly: f64,
    pub stddev: f64,
    pub z_score: f64,
    pub severity: String,
    pub pct_above_avg: f64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionAnomaly {
    pub id: uuid::Uuid,
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub category_avg: f64,
    pub times_avg: f64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct AnomaliesData {
    pub category_anomalies: Vec<CategoryAnomaly>,
    pub transaction_anomalies: Vec<TransactionAnomaly>,
}

// ── Forecast ──

#[derive(Debug, Serialize)]
pub struct CurrentMonthStatus {
    pub spent_so_far: f64,
    pub days_elapsed: u32,
    pub days_remaining: u32,
    pub days_in_month: u32,
}

#[derive(Debug, Serialize)]
pub struct Projections {
    pub linear: f64,
    pub day_weighted: f64,
    pub ewma: f64,
    pub recommended: f64,
}

#[derive(Debug, Serialize)]
pub struct CategoryForecast {
    pub category: String,
    pub spent_so_far: f64,
    pub projected: f64,
    pub avg_monthly: f64,
    pub vs_avg_pct: f64,
    pub trend: String,
}

#[derive(Debug, Serialize)]
pub struct ForecastData {
    pub current_month: CurrentMonthStatus,
    pub projections: Projections,
    pub vs_last_month: serde_json::Value,
    pub vs_average: serde_json::Value,
    pub category_forecasts: Vec<CategoryForecast>,
    pub trajectory: String,
}

// ── Habits ──

#[derive(Debug, Serialize)]
pub struct ImpulseSpending {
    pub score: f64,
    pub label: String,
    pub small_transaction_pct: f64,
    pub avg_small_amount: f64,
    pub monthly_small_total: f64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct CategoryCreep {
    pub category: String,
    pub trend: String,
    pub three_month_change_pct: f64,
    pub monthly_totals: Vec<f64>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct WeekendSplurge {
    pub weekend_avg_daily: f64,
    pub weekday_avg_daily: f64,
    pub ratio: f64,
    pub label: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct SubscriptionBloat {
    pub total_monthly: f64,
    pub total_annual: f64,
    pub count: i32,
    pub potentially_forgotten: Vec<String>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct MerchantConcentration {
    pub top_merchant: String,
    pub top_merchant_pct: f64,
    pub top_3_pct: f64,
    pub hhi: f64,
    pub label: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct HabitsData {
    pub impulse_spending: ImpulseSpending,
    pub category_creep: Vec<CategoryCreep>,
    pub weekend_splurge: WeekendSplurge,
    pub subscription_bloat: SubscriptionBloat,
    pub merchant_concentration: MerchantConcentration,
}

// ── Daily (for heatmap) ──

#[derive(Debug, Serialize)]
pub struct DailySpending {
    pub date: NaiveDate,
    pub total: f64,
    pub count: i32,
}

// ── Category Deep Dive ──

#[derive(Debug, Serialize)]
pub struct CategoryMerchant {
    pub merchant: String,
    pub total: f64,
    pub count: i64,
    pub avg_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct CategoryRecentTransaction {
    pub id: uuid::Uuid,
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct CategoryDeepDive {
    pub category: String,
    pub total_spent: f64,
    pub transaction_count: i64,
    pub avg_amount: f64,
    pub monthly_trend: Vec<serde_json::Value>,
    pub top_merchants: Vec<CategoryMerchant>,
    pub day_of_week: Vec<serde_json::Value>,
    pub recent_transactions: Vec<CategoryRecentTransaction>,
}

// ── Insights ──

#[derive(Debug, Serialize)]
pub struct Insight {
    pub r#type: String,
    pub severity: String,
    pub icon: String,
    pub title: String,
    pub message: String,
    pub metric: Option<serde_json::Value>,
    pub action: Option<String>,
    pub category: Option<String>,
}
