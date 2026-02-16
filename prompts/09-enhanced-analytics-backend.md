# Prompt 9: Enhanced Analytics Backend

## Goal
Add powerful analytics endpoints to the backend: enhance existing stats endpoints with trend data, and add new endpoints for recurring transaction detection, anomaly detection, spending forecasts, behavioral habit analysis, daily totals, category deep dives, and a smart insights engine. Also add a merchant name normalizer service. After this prompt, the backend provides all the data needed for advanced analytics UIs.

## Prerequisites
- Prompt 3 completed: Existing stats endpoints (`/api/stats/summary`, `/api/stats/monthly`, `/api/stats/merchants`, `/api/stats/patterns`) work
- Prompt 2 completed: Database tables exist, migrations run on startup
- Data has been imported via the import endpoint

## Reference
See `docs/analytics-features.md` for detailed algorithms, SQL queries, and response shapes.

## Detailed Tasks

### 1. Database Migration — Add `merchant_normalized` Column

In `backend/src/db.rs`, add to the migration function (after existing table creation):

```sql
-- Add normalized merchant name column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_normalized TEXT;
```

Then add a backfill query that runs once (only updates rows where `merchant_normalized IS NULL`):

```sql
UPDATE transactions
SET merchant_normalized = UPPER(TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(description, '\s*#\d+|\s*STORE\s*\d+|\s*\*[A-Z0-9]+', '', 'g'),
      ',\s*[A-Z]{2}\s*\d{5}.*$', '', 'g'
    ),
    '\s+', ' ', 'g'
  )
))
WHERE merchant_normalized IS NULL;
```

This is a rough SQL-level backfill. The Rust normalizer (next step) does a better job and will be used for all new imports.

### 2. Merchant Normalizer Service (`backend/src/services/merchant_normalizer.rs`)

Create a new service file.

**Module registration:** Add `pub mod merchant_normalizer;` to `backend/src/services/mod.rs`.

**Public function:**
```rust
pub fn normalize_merchant(description: &str) -> String
```

**Normalization pipeline:**
1. Convert to uppercase
2. Trim whitespace
3. Strip common payment prefixes:
   - `SQ *` (Square)
   - `TST*` or `TST *` (Toast)
   - `PP*` or `PAYPAL *` (PayPal)
   - `VENMO *`
   - `ZELLE *`
4. Strip store/location identifiers using regex:
   - `#\d+` (store numbers like `#12345`)
   - `STORE \d+`
   - `\*[A-Z0-9]{6,}` (reference codes like `*ABC123DEF`)
5. Strip trailing location info: `, XX \d{5}` patterns (city, state, zip)
6. Strip trailing numbers-only segments
7. Apply known merchant alias mappings:
   ```rust
   fn apply_aliases(name: &str) -> &str {
       // Check if the normalized name starts with any known alias
       let aliases: &[(&str, &str)] = &[
           ("AMZN", "AMAZON"),
           ("AMZN MKTPL", "AMAZON"),
           ("AMAZON.COM", "AMAZON"),
           ("AMAZON MKTPLACE", "AMAZON"),
           ("WM SUPERCENTER", "WALMART"),
           ("WAL-MART", "WALMART"),
           ("WALMART.COM", "WALMART"),
           ("WHOLEFDS", "WHOLE FOODS"),
           ("WHOLE FOODS MKT", "WHOLE FOODS"),
           ("COSTCO WHSE", "COSTCO"),
           ("COSTCO WHOLESALE", "COSTCO"),
           ("MCDONALD'S", "MCDONALDS"),
           ("CHICK-FIL-A", "CHICK-FIL-A"),
           ("DD/BR", "DUNKIN DONUTS"),
           ("DUNKIN", "DUNKIN DONUTS"),
       ];
       for (pattern, canonical) in aliases {
           if name.starts_with(pattern) {
               return canonical;
           }
       }
       name
   }
   ```
8. Final trim

**Integration with imports:** In the CSV import handler (`routes/import.rs`), after parsing each transaction, call `normalize_merchant(&txn.description)` and set the `merchant_normalized` field before inserting.

**Update `NewTransaction` model:** Add `merchant_normalized: String` field to the struct in `models/transaction.rs`. Update the INSERT query in `routes/import.rs` to include this column.

### 3. Enhanced Response Models (`backend/src/models/`)

Create a new file `backend/src/models/analytics.rs` for all analytics response structs.

**Module registration:** Add `pub mod analytics;` to `backend/src/models/mod.rs`.

```rust
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
    pub status: String,          // "active" or "inactive"
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
    pub severity: String,        // "elevated", "high", "critical"
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
    pub trend: String,           // "up", "down", "stable"
}

#[derive(Debug, Serialize)]
pub struct ForecastData {
    pub current_month: CurrentMonthStatus,
    pub projections: Projections,
    pub vs_last_month: serde_json::Value,
    pub vs_average: serde_json::Value,
    pub category_forecasts: Vec<CategoryForecast>,
    pub trajectory: String,      // "below_average", "near_average", "above_average", "well_above_average"
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
    pub trend: String,           // "increasing", "decreasing", "stable"
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
    pub r#type: String,          // "anomaly", "trend", "forecast", "habit", "recurring", "milestone", "positive"
    pub severity: String,        // "low", "medium", "high"
    pub icon: String,
    pub title: String,
    pub message: String,
    pub metric: Option<serde_json::Value>,
    pub action: Option<String>,
    pub category: Option<String>,
}
```

### 4. Enhance Existing Endpoints

#### 4a. Enhanced Summary (`GET /api/stats/summary`)

Modify the `get_summary` handler in `backend/src/routes/import.rs` to add these fields to the response:

**New queries to add:**

```rust
// Average monthly spending
let avg_monthly: (f64,) = sqlx::query_as(
    "SELECT COALESCE(SUM(amount::float8), 0) / \
     GREATEST(COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1) \
     FROM transactions"
)
.fetch_one(&pool).await.unwrap_or((0.0,));

// Daily rate this month
let days_elapsed = chrono::Local::now().day();
let daily_rate = if days_elapsed > 0 {
    this_month.0 / days_elapsed as f64
} else { 0.0 };

// Days in current month
let now = chrono::Local::now().naive_local().date();
let days_in_month = if now.month() == 12 {
    NaiveDate::from_ymd_opt(now.year() + 1, 1, 1)
} else {
    NaiveDate::from_ymd_opt(now.year(), now.month() + 1, 1)
}.unwrap().signed_duration_since(
    NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap()
).num_days() as u32;

let projected_month_total = daily_rate * days_in_month as f64;
```

**Updated response JSON:** Add `mom_change_pct`, `avg_monthly`, `vs_avg_pct`, `daily_rate`, `projected_month_total` to the response object. Add `avg_amount` to each `by_category` and `by_card` entry (compute as `total / count`).

**Computing MoM change:**
```rust
let mom_change_pct = if last_month.0 > 0.0 {
    Some((this_month.0 - last_month.0) / last_month.0 * 100.0)
} else {
    None
};

let vs_avg_pct = if avg_monthly.0 > 0.0 {
    Some((this_month.0 - avg_monthly.0) / avg_monthly.0 * 100.0)
} else {
    None
};
```

#### 4b. Enhanced Monthly (`GET /api/stats/monthly`)

Replace the `monthly` query with a window-function version:

```sql
SELECT
  to_char(date, 'YYYY-MM') as month,
  COALESCE(SUM(amount::float8), 0) as total,
  COUNT(*)::bigint as count,
  LAG(SUM(amount::float8)) OVER (ORDER BY to_char(date, 'YYYY-MM'))::float8 as prev_total,
  AVG(SUM(amount::float8)) OVER (
    ORDER BY to_char(date, 'YYYY-MM')
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  )::float8 as rolling_3mo_avg
FROM transactions
GROUP BY to_char(date, 'YYYY-MM')
ORDER BY month
```

Parse results into a struct that includes `prev_total`, `growth_pct` (computed in Rust), and `rolling_3mo_avg`.

**Updated response per month entry:**
```json
{
  "month": "2025-01",
  "total": 3456.78,
  "count": 89,
  "prev_total": 3100.00,
  "growth_pct": 11.5,
  "rolling_3mo_avg": 3200.00
}
```

The `growth_pct` is `null` for the first month (no previous).

#### 4c. Enhanced Merchants (`GET /api/stats/merchants`)

Replace the merchants query to use `merchant_normalized` (with fallback to `description`) and add enriched fields:

```sql
SELECT
  COALESCE(merchant_normalized, description) as merchant,
  COALESCE(SUM(amount::float8), 0) as total,
  COUNT(*)::bigint as count,
  COALESCE(AVG(amount::float8), 0) as avg_amount,
  MIN(date) as first_seen,
  MAX(date) as last_seen,
  COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months
FROM transactions
GROUP BY COALESCE(merchant_normalized, description)
ORDER BY SUM(amount) DESC
LIMIT 20
```

**Updated response per merchant entry:**
```json
{
  "merchant": "COSTCO",
  "total": 2345.67,
  "count": 15,
  "avg_amount": 156.38,
  "first_seen": "2025-06-15",
  "last_seen": "2026-01-20",
  "active_months": 8,
  "monthly_frequency": 1.875
}
```

`monthly_frequency` is computed in Rust: `count / active_months`.

### 5. New Endpoints

All new endpoints are registered as routes in `backend/src/routes/import.rs` (where the existing stats routes live). Add them to the `routes()` function.

**Route registration update:**
```rust
pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/transactions/import", post(import_csv))
        .route("/import-history", get(get_import_history))
        .route("/stats/summary", get(get_summary))
        .route("/stats/monthly", get(get_monthly))
        .route("/stats/merchants", get(get_merchants))
        .route("/stats/patterns", get(get_patterns))
        // New endpoints
        .route("/stats/recurring", get(get_recurring))
        .route("/stats/anomalies", get(get_anomalies))
        .route("/stats/forecast", get(get_forecast))
        .route("/stats/habits", get(get_habits))
        .route("/stats/daily", get(get_daily))
        .route("/stats/category/:category", get(get_category_deep_dive))
        .route("/insights", get(get_insights))
}
```

#### 5a. Recurring Detection (`GET /api/stats/recurring`)

Handler: `get_recurring`

**Implementation steps:**
1. Query grouped merchants with frequency and amount consistency data
2. Filter to candidates: 3+ active months, stddev < 20% of average
3. Compute `last_gap_days` = days since `last_seen`
4. Determine status: `"active"` if last_gap_days <= 45, else `"inactive"`
5. Flag `potentially_forgotten`: inactive but was previously consistent
6. Compute `estimated_annual = avg_amount * 12`
7. Sum totals for `total_monthly_recurring` and `total_annual_recurring`

**SQL:**
```sql
SELECT
  COALESCE(merchant_normalized, description) as merchant,
  COUNT(*)::int as total_count,
  COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months,
  COALESCE(AVG(amount::float8), 0) as avg_amount,
  COALESCE(STDDEV(amount::float8), 0) as amount_stddev,
  MIN(date) as first_seen,
  MAX(date) as last_seen
FROM transactions
GROUP BY COALESCE(merchant_normalized, description)
HAVING COUNT(DISTINCT to_char(date, 'YYYY-MM')) >= 3
ORDER BY AVG(amount) DESC
```

Then filter in Rust: keep only entries where `amount_stddev < avg_amount * 0.2` and `total_count / active_months` is between 0.7 and 1.5 (approximately monthly).

**Response:** `{ "data": RecurringData }`

#### 5b. Anomaly Detection (`GET /api/stats/anomalies`)

Handler: `get_anomalies`

**Implementation steps:**

Category anomalies:
1. Compute monthly totals per category across all history
2. Calculate mean and stddev per category (need at least 2 months of data)
3. Get current month's spending per category
4. Compute z-score: `(current - mean) / stddev`
5. Filter: only return categories with z-score > 1.5
6. Assign severity: 1.5–2.0 = "elevated", 2.0–3.0 = "high", >3.0 = "critical"
7. Generate human-readable message

**SQL for category baselines:**
```sql
WITH monthly_cat AS (
  SELECT
    category,
    to_char(date, 'YYYY-MM') as month,
    SUM(amount::float8) as total
  FROM transactions
  GROUP BY category, to_char(date, 'YYYY-MM')
)
SELECT
  category,
  AVG(total)::float8 as avg_monthly,
  COALESCE(STDDEV(total), 0)::float8 as stddev_monthly,
  COUNT(*)::int as month_count
FROM monthly_cat
GROUP BY category
HAVING COUNT(*) >= 2
```

**SQL for current month per category:**
```sql
SELECT category, COALESCE(SUM(amount::float8), 0) as total
FROM transactions
WHERE date >= date_trunc('month', CURRENT_DATE)::date
GROUP BY category
```

Transaction anomalies:
1. Compute average transaction amount per category
2. Find transactions this month where `amount > 2 * category_avg`
3. Compute `times_avg = amount / category_avg`
4. Limit to top 10 most anomalous

**SQL:**
```sql
WITH cat_avg AS (
  SELECT category, AVG(amount::float8) as avg_amount
  FROM transactions
  GROUP BY category
)
SELECT
  t.id, t.date, t.description, t.amount::float8 as amount,
  t.category, ca.avg_amount as category_avg
FROM transactions t
JOIN cat_avg ca ON t.category = ca.category
WHERE t.date >= date_trunc('month', CURRENT_DATE)::date
  AND t.amount::float8 > ca.avg_amount * 2
ORDER BY t.amount::float8 / ca.avg_amount DESC
LIMIT 10
```

**Response:** `{ "data": AnomaliesData }`

#### 5c. Spending Forecast (`GET /api/stats/forecast`)

Handler: `get_forecast`

**Implementation steps:**
1. Get current month total spent so far
2. Calculate `days_elapsed`, `days_remaining`, `days_in_month` using `chrono`
3. **Linear projection:** `spent_so_far / days_elapsed * days_in_month`
4. **Day-weighted projection:**
   - Query historical day-of-month averages
   - Compute weight for each remaining day
   - Sum `daily_rate * weight` for remaining days, add to spent_so_far
5. **EWMA projection:**
   - Query all historical monthly totals in order
   - Apply EWMA with alpha=0.3
   - Result is the predicted total for this month
6. **Blended/recommended:** Average of the three methods
7. Get last month total for comparison
8. Get average monthly for comparison
9. **Category forecasts:**
   - Get current month spending per category
   - Get historical average per category
   - Linear project each category
   - Determine trend: if projected > avg * 1.1 → "up", < avg * 0.9 → "down", else "stable"
10. **Trajectory:** Compare recommended projection to avg_monthly:
    - < avg * 0.9: "below_average"
    - avg * 0.9 to avg * 1.1: "near_average"
    - avg * 1.1 to avg * 1.3: "above_average"
    - \> avg * 1.3: "well_above_average"

**Key Rust helper functions:**
```rust
fn linear_projection(spent: f64, days_elapsed: u32, days_in_month: u32) -> f64 {
    if days_elapsed == 0 { return 0.0; }
    (spent / days_elapsed as f64) * days_in_month as f64
}

fn ewma(monthly_totals: &[f64], alpha: f64) -> f64 {
    if monthly_totals.is_empty() { return 0.0; }
    let mut result = monthly_totals[0];
    for &total in &monthly_totals[1..] {
        result = alpha * total + (1.0 - alpha) * result;
    }
    result
}
```

**Response:** `{ "data": ForecastData }`

#### 5d. Bad Habits Detection (`GET /api/stats/habits`)

Handler: `get_habits`

Runs 5 independent detectors and combines results. Each detector queries the database and computes scores/messages.

**Impulse spending:**
```sql
SELECT
  COUNT(*)::int as total_count,
  COUNT(*) FILTER (WHERE amount::float8 < 15)::int as small_count,
  COALESCE(SUM(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as small_total,
  COALESCE(AVG(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as avg_small
FROM transactions
WHERE date >= (CURRENT_DATE - interval '90 days')
```

Score mapping:
- `small_pct > 50`: score 0.8, label "high"
- `small_pct > 35`: score 0.5, label "moderate"
- `small_pct > 20`: score 0.3, label "low"
- else: score 0.1, label "minimal"

Monthly small total = `small_total / 3.0` (3 months of data).

**Category creep:**
```sql
SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total
FROM transactions
WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '6 months')::date
GROUP BY category, to_char(date, 'YYYY-MM')
ORDER BY category, month
```

In Rust: group by category, split monthly totals into recent 3 months and prior 3 months, compute `change_pct = (recent_avg - prior_avg) / prior_avg * 100`. Report categories where `change_pct > 15`.

**Weekend splurge:**
```sql
WITH daily AS (
  SELECT date, SUM(amount::float8) as day_total, EXTRACT(DOW FROM date)::int as dow
  FROM transactions
  WHERE date >= (CURRENT_DATE - interval '90 days')
  GROUP BY date
)
SELECT
  COALESCE(AVG(day_total) FILTER (WHERE dow IN (0, 6)), 0) as weekend_avg,
  COALESCE(AVG(day_total) FILTER (WHERE dow NOT IN (0, 6)), 0) as weekday_avg
FROM daily
```

Ratio = weekend_avg / weekday_avg. Labels:
- ratio > 2.0: "high"
- ratio > 1.5: "moderate"
- ratio > 1.2: "slight"
- else: "balanced"

**Subscription bloat:** Reuse the recurring detection logic from `get_recurring`. Sum active recurring amounts. Flag those with `last_seen` > 45 days ago.

**Merchant concentration:**
```sql
WITH merchant_totals AS (
  SELECT
    COALESCE(merchant_normalized, description) as merchant,
    SUM(amount::float8) as total
  FROM transactions
  WHERE date >= (CURRENT_DATE - interval '90 days')
  GROUP BY COALESCE(merchant_normalized, description)
),
with_share AS (
  SELECT merchant, total, total / SUM(total) OVER () as share
  FROM merchant_totals
)
SELECT
  merchant, total, share
FROM with_share
ORDER BY total DESC
```

Compute HHI in Rust: `sum(share^2)` for all merchants. Top 3 pct = sum of top 3 shares * 100.

Labels:
- HHI > 0.25: "high"
- HHI > 0.15: "moderate"
- HHI > 0.10: "mild"
- else: "diversified"

**Response:** `{ "data": HabitsData }`

#### 5e. Daily Spending (`GET /api/stats/daily`)

Handler: `get_daily`

**Query params:** `start_date` (optional, default 365 days ago), `end_date` (optional, default today).

Parse query params using a `DailyQuery` struct:
```rust
#[derive(Deserialize)]
pub struct DailyQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}
```

**SQL:**
```sql
SELECT
  date,
  COALESCE(SUM(amount::float8), 0) as total,
  COUNT(*)::int as count
FROM transactions
WHERE date >= $1 AND date <= $2
GROUP BY date
ORDER BY date
```

**Response:** `{ "data": [DailySpending] }`

#### 5f. Category Deep Dive (`GET /api/stats/category/:category`)

Handler: `get_category_deep_dive`

**Extract path parameter:**
```rust
async fn get_category_deep_dive(
    State(pool): State<PgPool>,
    axum::extract::Path(category): axum::extract::Path<String>,
) -> Json<serde_json::Value>
```

**Queries (all filtered to the specified category):**

1. Total and count:
```sql
SELECT COALESCE(SUM(amount::float8), 0), COUNT(*)::bigint, COALESCE(AVG(amount::float8), 0)
FROM transactions WHERE category = $1
```

2. Monthly trend:
```sql
SELECT to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as total, COUNT(*)::bigint as count
FROM transactions WHERE category = $1
GROUP BY to_char(date, 'YYYY-MM') ORDER BY month
```

3. Top merchants (within category):
```sql
SELECT COALESCE(merchant_normalized, description) as merchant,
  SUM(amount::float8) as total, COUNT(*)::bigint as count, AVG(amount::float8) as avg_amount
FROM transactions WHERE category = $1
GROUP BY COALESCE(merchant_normalized, description)
ORDER BY SUM(amount) DESC LIMIT 10
```

4. Day-of-week pattern (within category):
```sql
SELECT EXTRACT(DOW FROM date)::int as dow, SUM(amount::float8) as total, COUNT(*)::bigint as count
FROM transactions WHERE category = $1
GROUP BY EXTRACT(DOW FROM date) ORDER BY dow
```

5. Recent transactions (last 10):
```sql
SELECT id, date, description, amount::float8 as amount
FROM transactions WHERE category = $1
ORDER BY date DESC LIMIT 10
```

**Response:** `{ "data": CategoryDeepDive }`

#### 5g. Smart Insights Engine (`GET /api/insights`)

Handler: `get_insights`

This is the most complex endpoint. It orchestrates data from multiple queries and generates ranked insights.

**Implementation approach:**

Create a helper function for each insight type. Each returns `Vec<Insight>` with a priority score. Then collect all, sort by priority descending, return top 8.

```rust
struct ScoredInsight {
    insight: Insight,
    priority: f64,
}
```

**Insight generators:**

1. **Anomaly insights** (priority 90–100): Run the category anomaly detection. For each anomaly with z_score > 2.0, create an insight.

2. **MoM trend insights** (priority 70–85): If this month's spending is 20%+ above or below last month, generate an insight.

3. **Forecast insights** (priority 60–75): If the recommended projection is 15%+ above the historical average, warn about overspending trajectory.

4. **Habit insights** (priority 40–60):
   - Impulse score > 0.5 → generate impulse insight
   - Any category creep > 25% → generate creep insight
   - Weekend splurge ratio > 1.5 → generate weekend insight

5. **Recurring insights** (priority 50–65):
   - If any potentially forgotten subscriptions → generate alert
   - Total recurring > $100/month → generate summary

6. **Positive insights** (priority 20–30):
   - If this month is below average → "Great month so far!"
   - If any category trending down → positive reinforcement

**Scoring formula:**
```rust
fn score_anomaly(z_score: f64) -> f64 {
    90.0 + (z_score.min(5.0) * 2.0)
}

fn score_trend(change_pct: f64) -> f64 {
    70.0 + (change_pct.abs().min(50.0) * 0.3)
}
```

Collect all `ScoredInsight`s, sort descending by priority, take the top 8, return just the `Insight` structs.

**Response:** `{ "data": [Insight] }`

### 6. Update Import Handler

In the `import_csv` handler in `routes/import.rs`, after parsing CSV rows:

1. Call `merchant_normalizer::normalize_merchant(&txn.description)` for each transaction
2. Set the `merchant_normalized` field on the `NewTransaction`
3. Update the INSERT query to include `merchant_normalized`:

```sql
INSERT INTO transactions (date, description, amount, category, card, card_label, raw_data, hash, merchant_normalized)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
```

## Verification

Test all endpoints with curl after `docker-compose up --build`:

```bash
# Ensure existing endpoints still work
curl localhost:8080/api/stats/summary
# → Should now include mom_change_pct, avg_monthly, vs_avg_pct, daily_rate, projected_month_total

curl localhost:8080/api/stats/monthly
# → Each month should include prev_total, growth_pct, rolling_3mo_avg

curl localhost:8080/api/stats/merchants
# → Each merchant should include avg_amount, first_seen, last_seen, active_months, monthly_frequency
# → Merchants should be normalized (STARBUCKS, not STARBUCKS STORE 12345)

# New endpoints
curl localhost:8080/api/stats/recurring
# → Should list detected recurring transactions with estimated costs

curl localhost:8080/api/stats/anomalies
# → Should list any category or transaction anomalies (may be empty if no spikes)

curl localhost:8080/api/stats/forecast
# → Should show projections (linear, day_weighted, ewma, recommended) and category forecasts

curl localhost:8080/api/stats/habits
# → Should show all 5 habit detectors with scores and messages

curl "localhost:8080/api/stats/daily?start_date=2025-01-01&end_date=2026-02-15"
# → Should return daily spending totals

curl localhost:8080/api/stats/category/Dining
# → Should return deep dive for Dining category

curl localhost:8080/api/insights
# → Should return top 5-8 ranked insights

# Verify merchant normalization on new import
curl -F "file=@test_amex.csv" localhost:8080/api/transactions/import
curl "localhost:8080/api/transactions?per_page=5"
# → Transactions should have merchant_normalized field populated
```

**No breaking changes:** All existing endpoints return the same fields as before plus new ones. Frontend code using the old response shape continues to work.
