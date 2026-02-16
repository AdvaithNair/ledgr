# Ledgr Analytics Features — Comprehensive Reference

## Table of Contents

1. [Current Analytics Assessment](#current-analytics-assessment)
2. [Critical Gaps](#critical-gaps)
3. [Proposed Improvements](#proposed-improvements)
4. [Forecasting Deep Dive](#forecasting-deep-dive)
5. [Bad Habits Detection](#bad-habits-detection)
6. [Implementation Sequencing](#implementation-sequencing)
7. [Technical Reference](#technical-reference)

---

## Current Analytics Assessment

### Existing Endpoints (Prompt 03)

| Endpoint | Purpose | Rating | Notes |
|---|---|---|---|
| `GET /api/stats/summary` | Total spent, this/last month, by card, by category | **B** | Good foundation but missing MoM change %, averages, daily rates |
| `GET /api/stats/monthly` | Monthly totals, by card, by category | **B-** | No growth %, rolling averages, or trend indicators |
| `GET /api/stats/merchants` | Top 20 merchants by total | **C** | Raw descriptions (not normalized), no frequency/avg data |
| `GET /api/stats/patterns` | Day-of-week and day-of-month totals | **B** | Solid but limited — no hourly, seasonal, or temporal analysis |

### What Works Well

- **Solid data foundation:** All transaction data is in PostgreSQL with proper indexes
- **Card-agnostic architecture:** Dynamic card system supports any number of cards
- **Deduplication:** Overlapping imports handled correctly via SHA256 hashing
- **Category system:** Auto-categorization with manual override and bulk edit

### What's Missing

The current analytics are purely **descriptive** — they tell you what happened but not:
- **What's changing** (trends, growth rates, momentum)
- **What's unusual** (anomalies, outliers, sudden spikes)
- **What will happen** (forecasting, projections)
- **What to watch out for** (bad habits, subscription creep, impulse patterns)
- **What matters most** (ranked insights, smart prioritization)

---

## Critical Gaps

### Gap 1: No Month-over-Month Context
Summary shows `this_month` and `last_month` but doesn't compute the % change, whether spending is above/below average, or the trajectory.

### Gap 2: No Merchant Normalization
`STARBUCKS STORE 12345`, `STARBUCKS #12345`, and `STARBUCKS COFFEE` are treated as separate merchants. This fragments merchant-level analysis.

### Gap 3: No Recurring Transaction Detection
Subscriptions and recurring charges (Netflix, Spotify, gym, insurance) aren't identified. Users can't see their fixed monthly costs or detect forgotten subscriptions.

### Gap 4: No Anomaly Detection
A $500 grocery bill or a sudden 3x spike in dining spending goes unnoticed. There's no statistical baseline to flag unusual activity.

### Gap 5: No Forecasting
Users can't see projected end-of-month spending based on current velocity. No category-level projections or trend extrapolation.

### Gap 6: No Behavioral Pattern Analysis
No detection of impulse spending, weekend splurges, category creep (gradually spending more in a category), or merchant concentration risk.

### Gap 7: No Smart Insights
Users must interpret raw charts themselves. No system that surfaces the 5-8 most important findings automatically.

---

## Proposed Improvements

### Tier 1 — Enhance Existing Endpoints (Low effort, high impact)

These modify existing endpoint responses to include additional computed fields. No new routes needed.

#### 1.1 Enhanced Summary (`GET /api/stats/summary`)

**Add fields:**

| Field | Computation | Purpose |
|---|---|---|
| `mom_change_pct` | `(this_month - last_month) / last_month * 100` | Month-over-month spending change |
| `avg_monthly` | `total_spent / count_distinct_months` | Historical average monthly spend |
| `vs_avg_pct` | `(this_month - avg_monthly) / avg_monthly * 100` | Current month vs historical average |
| `daily_rate` | `this_month / days_elapsed_this_month` | Current daily spending rate |
| `projected_month_total` | `daily_rate * days_in_month` | Linear end-of-month projection |
| `by_category[].avg_amount` | `category_total / category_count` | Average transaction size per category |
| `by_card[].avg_amount` | `card_total / card_count` | Average transaction size per card |

**SQL for `avg_monthly`:**
```sql
SELECT COALESCE(SUM(amount::float8), 0) / GREATEST(
  COUNT(DISTINCT to_char(date, 'YYYY-MM')), 1
) FROM transactions
```

**SQL for `daily_rate`:**
```sql
SELECT COALESCE(SUM(amount::float8), 0) /
  GREATEST(EXTRACT(DAY FROM CURRENT_DATE), 1)
FROM transactions
WHERE date >= date_trunc('month', CURRENT_DATE)::date
```

#### 1.2 Enhanced Monthly (`GET /api/stats/monthly`)

**Add fields to each month entry:**

| Field | Computation | Purpose |
|---|---|---|
| `prev_total` | Previous month's total | Context for change |
| `growth_pct` | `(total - prev_total) / prev_total * 100` | Month-over-month growth |
| `rolling_3mo_avg` | Average of current + 2 prior months | Smoothed trend line |

**SQL with window functions:**
```sql
SELECT
  to_char(date, 'YYYY-MM') as month,
  COALESCE(SUM(amount::float8), 0) as total,
  COUNT(*)::bigint as count,
  LAG(SUM(amount::float8)) OVER (ORDER BY to_char(date, 'YYYY-MM')) as prev_total,
  AVG(SUM(amount::float8)) OVER (
    ORDER BY to_char(date, 'YYYY-MM')
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as rolling_3mo_avg
FROM transactions
GROUP BY to_char(date, 'YYYY-MM')
ORDER BY month
```

Growth percentage is computed in Rust from `total` and `prev_total`.

#### 1.3 Enhanced Merchants (`GET /api/stats/merchants`)

**Add fields:**

| Field | Computation | Purpose |
|---|---|---|
| `avg_amount` | `total / count` | Average transaction size |
| `first_seen` | `MIN(date)` | When you started spending here |
| `last_seen` | `MAX(date)` | Most recent transaction |
| `active_months` | `COUNT(DISTINCT month)` | How many months you've been going |
| `monthly_frequency` | `count / active_months` | How often per month |

**SQL:**
```sql
SELECT
  description as merchant,
  COALESCE(SUM(amount::float8), 0) as total,
  COUNT(*)::bigint as count,
  COALESCE(AVG(amount::float8), 0) as avg_amount,
  MIN(date) as first_seen,
  MAX(date) as last_seen,
  COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months
FROM transactions
GROUP BY description
ORDER BY SUM(amount) DESC
LIMIT 20
```

---

### Tier 2 — New Analytics Endpoints (Medium effort, high impact)

#### 2.1 Recurring Transaction Detection (`GET /api/stats/recurring`)

Detect subscriptions and recurring charges by analyzing merchant frequency and amount consistency.

**Algorithm:**
1. Group transactions by normalized merchant name
2. For each merchant, compute: transaction count, unique months active, amount std deviation
3. A transaction is "recurring" if:
   - Appears in 3+ distinct months
   - Amount std deviation < 20% of average amount (consistent pricing)
   - Monthly frequency close to 1 (once per month, ±0.3)

**SQL (candidate detection):**
```sql
SELECT
  description as merchant,
  COUNT(*)::int as total_count,
  COUNT(DISTINCT to_char(date, 'YYYY-MM'))::int as active_months,
  COALESCE(AVG(amount::float8), 0) as avg_amount,
  COALESCE(STDDEV(amount::float8), 0) as amount_stddev,
  MIN(date) as first_seen,
  MAX(date) as last_seen
FROM transactions
GROUP BY description
HAVING COUNT(DISTINCT to_char(date, 'YYYY-MM')) >= 3
  AND COALESCE(STDDEV(amount::float8), 0) < AVG(amount::float8) * 0.2
ORDER BY AVG(amount) DESC
```

**Response shape:**
```json
{
  "data": {
    "recurring": [
      {
        "merchant": "NETFLIX.COM",
        "avg_amount": 15.99,
        "frequency": "monthly",
        "active_months": 8,
        "first_seen": "2025-06-01",
        "last_seen": "2026-01-15",
        "estimated_annual": 191.88,
        "status": "active",
        "last_gap_days": 32,
        "potentially_forgotten": false
      }
    ],
    "total_monthly_recurring": 89.95,
    "total_annual_recurring": 1079.40
  }
}
```

**"Potentially forgotten" detection:** If the gap between `last_seen` and today exceeds 1.5x the average gap between occurrences, flag as potentially forgotten.

#### 2.2 Anomaly Detection (`GET /api/stats/anomalies`)

Two levels: category-level anomalies (spending spikes by category this month) and transaction-level anomalies (individual large transactions).

**Category anomalies — z-score method:**
1. For each category, compute historical monthly average and standard deviation
2. Compare current month's spending to the baseline
3. Flag if z-score > 1.5 (i.e., spending is 1.5+ standard deviations above average)

**SQL (category baselines):**
```sql
WITH monthly_cat AS (
  SELECT
    category,
    to_char(date, 'YYYY-MM') as month,
    SUM(amount::float8) as total
  FROM transactions
  GROUP BY category, to_char(date, 'YYYY-MM')
),
baselines AS (
  SELECT
    category,
    AVG(total) as avg_monthly,
    STDDEV(total) as stddev_monthly,
    COUNT(*) as month_count
  FROM monthly_cat
  GROUP BY category
  HAVING COUNT(*) >= 2
)
SELECT
  b.category,
  b.avg_monthly,
  b.stddev_monthly,
  COALESCE(c.total, 0) as current_month,
  CASE WHEN b.stddev_monthly > 0
    THEN (COALESCE(c.total, 0) - b.avg_monthly) / b.stddev_monthly
    ELSE 0
  END as z_score
FROM baselines b
LEFT JOIN monthly_cat c
  ON b.category = c.category
  AND c.month = to_char(CURRENT_DATE, 'YYYY-MM')
ORDER BY z_score DESC
```

**Transaction anomalies:**
For each transaction this month, flag if amount > 2x the average for that category.

**Response shape:**
```json
{
  "data": {
    "category_anomalies": [
      {
        "category": "Dining",
        "current_month": 1200.00,
        "avg_monthly": 600.00,
        "stddev": 150.00,
        "z_score": 4.0,
        "severity": "high",
        "pct_above_avg": 100.0,
        "message": "Dining spending is 2x your monthly average"
      }
    ],
    "transaction_anomalies": [
      {
        "id": "uuid",
        "date": "2026-01-15",
        "description": "WHOLE FOODS MKT",
        "amount": 350.00,
        "category": "Groceries",
        "category_avg": 87.00,
        "times_avg": 4.0,
        "message": "4x your average Groceries transaction"
      }
    ]
  }
}
```

**Severity levels:**
- z-score 1.5–2.0: `"elevated"` (yellow)
- z-score 2.0–3.0: `"high"` (orange)
- z-score > 3.0: `"critical"` (red)

#### 2.3 Spending Forecast (`GET /api/stats/forecast`)

Three projection methods for end-of-month spending:

1. **Linear:** `daily_rate * days_in_month` (simple, current month pace)
2. **Day-weighted:** Weight recent days more heavily using an exponential decay
3. **EWMA (Exponentially Weighted Moving Average):** Use historical monthly totals with exponential smoothing (alpha=0.3) to predict next month

Also provide per-category forecasts using the linear method.

See [Forecasting Deep Dive](#forecasting-deep-dive) for detailed algorithms.

**Response shape:**
```json
{
  "data": {
    "current_month": {
      "spent_so_far": 1500.00,
      "days_elapsed": 15,
      "days_remaining": 16,
      "days_in_month": 31
    },
    "projections": {
      "linear": 3100.00,
      "day_weighted": 2900.00,
      "ewma": 3200.00,
      "recommended": 3050.00
    },
    "vs_last_month": {
      "last_month_total": 2800.00,
      "projected_change_pct": 8.9
    },
    "vs_average": {
      "avg_monthly": 2650.00,
      "projected_change_pct": 15.1
    },
    "category_forecasts": [
      {
        "category": "Dining",
        "spent_so_far": 400.00,
        "projected": 826.67,
        "avg_monthly": 600.00,
        "vs_avg_pct": 37.8,
        "trend": "up"
      }
    ],
    "trajectory": "above_average"
  }
}
```

#### 2.4 Bad Habits Detection (`GET /api/stats/habits`)

Five behavioral pattern detectors. See [Bad Habits Detection](#bad-habits-detection) for algorithms.

**Response shape:**
```json
{
  "data": {
    "impulse_spending": {
      "score": 0.35,
      "label": "moderate",
      "small_transaction_pct": 42.0,
      "avg_small_amount": 8.50,
      "monthly_small_total": 320.00,
      "message": "42% of your transactions are under $15 — totaling $320/month"
    },
    "category_creep": [
      {
        "category": "Dining",
        "trend": "increasing",
        "three_month_change_pct": 25.0,
        "monthly_totals": [500, 550, 625],
        "message": "Dining spending up 25% over 3 months"
      }
    ],
    "weekend_splurge": {
      "weekend_avg_daily": 120.00,
      "weekday_avg_daily": 65.00,
      "ratio": 1.85,
      "label": "moderate",
      "message": "You spend 85% more on weekends"
    },
    "subscription_bloat": {
      "total_monthly": 89.95,
      "total_annual": 1079.40,
      "count": 6,
      "potentially_forgotten": ["GYM MEMBERSHIP"],
      "message": "6 subscriptions totaling $89.95/month ($1,079/year)"
    },
    "merchant_concentration": {
      "top_merchant": "COSTCO WHOLESALE",
      "top_merchant_pct": 22.0,
      "top_3_pct": 48.0,
      "hhi": 0.12,
      "label": "moderate",
      "message": "48% of spending at your top 3 merchants"
    }
  }
}
```

#### 2.5 Daily Spending Totals (`GET /api/stats/daily`)

For calendar heatmap visualization.

**Query params:** `start_date`, `end_date` (defaults to last 365 days)

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

**Response shape:**
```json
{
  "data": [
    { "date": "2026-01-01", "total": 45.67, "count": 3 },
    { "date": "2026-01-02", "total": 120.50, "count": 5 }
  ]
}
```

#### 2.6 Category Deep Dive (`GET /api/stats/category/{category}`)

Single-category analysis when a user clicks into a specific category.

**Response shape:**
```json
{
  "data": {
    "category": "Dining",
    "total_spent": 4500.00,
    "transaction_count": 180,
    "avg_amount": 25.00,
    "monthly_trend": [
      { "month": "2025-09", "total": 500.00, "count": 20 }
    ],
    "top_merchants": [
      { "merchant": "STARBUCKS", "total": 800.00, "count": 60, "avg_amount": 13.33 }
    ],
    "day_of_week": [
      { "day": "Mon", "day_num": 1, "total": 600.00, "count": 25 }
    ],
    "recent_transactions": [
      { "id": "uuid", "date": "2026-01-15", "description": "STARBUCKS", "amount": 5.75 }
    ]
  }
}
```

#### 2.7 Smart Insights Engine (`GET /api/insights`)

Generates ranked, human-readable insights from all available data. Returns the top 5–8 most significant findings.

**Insight categories and priority scoring:**
1. **Anomaly alerts** (priority: high) — category spending spikes this month
2. **Trend changes** (priority: high) — significant MoM changes (>20%)
3. **Forecast warnings** (priority: medium-high) — projected to exceed average
4. **Habit flags** (priority: medium) — bad habit scores above threshold
5. **Recurring insights** (priority: medium) — forgotten subscriptions, total recurring cost
6. **Milestone markers** (priority: low) — new merchant discovered, category record
7. **Positive reinforcement** (priority: low) — spending down in a category, below average month

**Response shape:**
```json
{
  "data": [
    {
      "type": "anomaly",
      "severity": "high",
      "icon": "alert-triangle",
      "title": "Dining spending doubled",
      "message": "You've spent $1,200 on Dining this month — 2x your $600 average.",
      "metric": { "value": 1200.00, "comparison": 600.00, "unit": "dollars" },
      "action": "Review recent dining transactions",
      "category": "Dining"
    },
    {
      "type": "forecast",
      "severity": "medium",
      "icon": "trending-up",
      "title": "On pace for a high month",
      "message": "Projected $3,100 this month vs your $2,650 average.",
      "metric": { "value": 3100.00, "comparison": 2650.00, "unit": "dollars" }
    }
  ]
}
```

Each insight is generated by a scoring function, all insights are collected, sorted by priority score descending, and the top 5–8 are returned.

---

### Tier 3 — Infrastructure Improvements (Medium effort, foundational)

#### 3.1 Merchant Name Normalization

**Problem:** `STARBUCKS STORE 12345`, `STARBUCKS #12345`, `STARBUCKS COFFEE CO` are separate merchants.

**Solution: `services/merchant_normalizer.rs`**

Normalization pipeline:
1. Uppercase the description
2. Strip common suffixes: `#\d+`, `STORE \d+`, `\*[A-Z0-9]+`, location info after the last `,`
3. Remove trailing numbers and special characters
4. Apply known merchant mappings (e.g., `AMZN MKTPL` → `AMAZON`)
5. Strip common prefixes: `SQ *`, `TST*`, `PP*`, `PAYPAL *`

**Known merchant mappings:**
```rust
const MERCHANT_ALIASES: &[(&str, &str)] = &[
    ("AMZN", "AMAZON"),
    ("AMZN MKTPL", "AMAZON"),
    ("AMAZON.COM", "AMAZON"),
    ("WM SUPERCENTER", "WALMART"),
    ("WAL-MART", "WALMART"),
    ("WHOLEFDS", "WHOLE FOODS"),
    ("WHOLE FOODS MKT", "WHOLE FOODS"),
    ("COSTCO WHSE", "COSTCO"),
    ("COSTCO WHOLESALE", "COSTCO"),
    // ... more as needed
];
```

**Database change:** Add `merchant_normalized TEXT` column to `transactions` table. Backfill existing rows. Populate on new imports.

#### 3.2 Migration System for New Columns

Since the app uses inline migrations (Prompt 02), add new `ALTER TABLE` statements that run idempotently:

```sql
-- Add normalized merchant column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_normalized TEXT;

-- Backfill existing rows
UPDATE transactions
SET merchant_normalized = UPPER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(description, '#\d+|STORE \d+|\*[A-Z0-9]+', '', 'g'),
    '\s+', ' ', 'g'
  )
)
WHERE merchant_normalized IS NULL;
```

The full Rust-side normalization is more sophisticated than the SQL backfill — new imports use the Rust normalizer, while the SQL backfill handles legacy data approximately.

---

## Forecasting Deep Dive

All forecasting is local computation — no external APIs, no ML libraries, pure Rust + SQL.

### Method 1: Linear Projection

The simplest method. Extrapolate from the current daily rate.

```
daily_rate = this_month_total / days_elapsed
projected = daily_rate * days_in_month
```

**Strengths:** Simple, intuitive, reflects current month's actual pace.
**Weaknesses:** Doesn't account for day-of-month patterns (rent on the 1st, subscriptions mid-month).

**Rust implementation:**
```rust
fn linear_projection(spent_so_far: f64, days_elapsed: u32, days_in_month: u32) -> f64 {
    if days_elapsed == 0 { return 0.0; }
    let daily_rate = spent_so_far / days_elapsed as f64;
    daily_rate * days_in_month as f64
}
```

### Method 2: Day-Weighted Projection

Uses historical day-of-month spending patterns to weight the projection.

```
For each remaining day d in the month:
  weight[d] = historical_avg_spend_on_day_d / overall_daily_avg
  projected_day[d] = current_daily_rate * weight[d]
projected_remaining = sum(projected_day[d] for each remaining day)
projected_total = spent_so_far + projected_remaining
```

**Strengths:** Accounts for patterns like rent on the 1st, subscriptions on the 15th.
**Weaknesses:** Requires enough history to have reliable day-of-month averages.

**SQL for day-of-month weights:**
```sql
WITH daily AS (
  SELECT
    EXTRACT(DAY FROM date)::int as dom,
    AVG(day_total) as avg_daily
  FROM (
    SELECT date, SUM(amount::float8) as day_total
    FROM transactions
    GROUP BY date
  ) t
  GROUP BY EXTRACT(DAY FROM date)::int
),
overall AS (
  SELECT AVG(avg_daily) as overall_avg FROM daily
)
SELECT dom, avg_daily / overall_avg as weight
FROM daily, overall
ORDER BY dom
```

### Method 3: EWMA (Exponentially Weighted Moving Average)

Predicts next month based on a weighted history where recent months matter more.

```
S_t = alpha * X_t + (1 - alpha) * S_{t-1}
```

With `alpha = 0.3`:
- Current month: 30% weight
- Last month: 21% weight
- 2 months ago: 14.7% weight
- etc. (exponentially decaying)

**Rust implementation:**
```rust
fn ewma_projection(monthly_totals: &[f64], alpha: f64) -> f64 {
    if monthly_totals.is_empty() { return 0.0; }
    let mut ewma = monthly_totals[0];
    for &total in &monthly_totals[1..] {
        ewma = alpha * total + (1.0 - alpha) * ewma;
    }
    ewma
}
```

**Strengths:** Smooth, adapts to trends, weights recent data more.
**Weaknesses:** Doesn't account for intra-month patterns.

### Method 4: Blended (Recommended)

Average of all three methods, giving the most robust projection:

```rust
fn blended_projection(linear: f64, day_weighted: f64, ewma: f64) -> f64 {
    (linear + day_weighted + ewma) / 3.0
}
```

The `recommended` field in the response uses this blended value.

### Category-Level Forecasts

For each category, use the linear method only (simpler, sufficient granularity):

```sql
SELECT
  category,
  SUM(amount::float8) as spent_so_far
FROM transactions
WHERE date >= date_trunc('month', CURRENT_DATE)::date
GROUP BY category
```

Then project: `category_projected = (category_spent / days_elapsed) * days_in_month`

Compare against historical category average:
```sql
SELECT category, AVG(monthly_total) as avg_monthly
FROM (
  SELECT category, to_char(date, 'YYYY-MM') as month, SUM(amount::float8) as monthly_total
  FROM transactions
  GROUP BY category, to_char(date, 'YYYY-MM')
) t
GROUP BY category
```

---

## Bad Habits Detection

Five behavioral pattern detectors, each producing a score and human-readable message. All pure SQL + Rust — no ML required.

### Habit 1: Impulse Spending

**Definition:** High frequency of small transactions (under a threshold) that add up to a significant monthly total.

**Algorithm:**
1. Define "small transaction" threshold: $15
2. Count: total transactions, small transactions, small transaction total
3. Compute `small_pct = small_count / total_count * 100`
4. Score:
   - `small_pct > 50%`: score 0.8 ("high")
   - `small_pct > 35%`: score 0.5 ("moderate")
   - `small_pct > 20%`: score 0.3 ("low")
   - else: score 0.1 ("minimal")

**SQL:**
```sql
WITH stats AS (
  SELECT
    COUNT(*)::int as total_count,
    COUNT(*) FILTER (WHERE amount::float8 < 15)::int as small_count,
    COALESCE(SUM(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as small_total,
    COALESCE(AVG(amount::float8) FILTER (WHERE amount::float8 < 15), 0) as avg_small
  FROM transactions
  WHERE date >= date_trunc('month', CURRENT_DATE) - interval '3 months'
)
SELECT
  total_count,
  small_count,
  small_total,
  avg_small,
  CASE WHEN total_count > 0
    THEN small_count::float / total_count * 100
    ELSE 0
  END as small_pct,
  small_total / 3.0 as monthly_avg_small
FROM stats
```

### Habit 2: Category Creep

**Definition:** Gradual, sustained increase in spending within a category over 3+ months.

**Algorithm:**
1. For each category, get the last 3–6 months of totals
2. Compute linear regression slope (or simpler: compare most recent 3-month average to prior 3-month average)
3. If the recent average is 15%+ higher than the prior average, flag as creeping

**Simplified approach (no linear regression):**
```rust
fn detect_creep(recent_3: &[f64], prior_3: &[f64]) -> Option<f64> {
    let recent_avg = recent_3.iter().sum::<f64>() / recent_3.len() as f64;
    let prior_avg = prior_3.iter().sum::<f64>() / prior_3.len() as f64;
    if prior_avg == 0.0 { return None; }
    let change_pct = (recent_avg - prior_avg) / prior_avg * 100.0;
    if change_pct > 15.0 { Some(change_pct) } else { None }
}
```

**SQL:**
```sql
SELECT
  category,
  to_char(date, 'YYYY-MM') as month,
  SUM(amount::float8) as total
FROM transactions
WHERE date >= (date_trunc('month', CURRENT_DATE) - interval '6 months')::date
GROUP BY category, to_char(date, 'YYYY-MM')
ORDER BY category, month
```

Then group by category in Rust, split into recent/prior halves, and compute.

### Habit 3: Weekend Splurge

**Definition:** Significantly higher daily spending on weekends (Sat+Sun) vs weekdays.

**Algorithm:**
1. Compute average daily spend for weekdays (Mon–Fri) and weekends (Sat–Sun)
2. Ratio = weekend_avg / weekday_avg
3. Score:
   - ratio > 2.0: "high"
   - ratio > 1.5: "moderate"
   - ratio > 1.2: "slight"
   - else: "balanced"

**SQL:**
```sql
WITH daily AS (
  SELECT
    date,
    SUM(amount::float8) as day_total,
    EXTRACT(DOW FROM date)::int as dow
  FROM transactions
  WHERE date >= (CURRENT_DATE - interval '90 days')
  GROUP BY date
)
SELECT
  COALESCE(AVG(day_total) FILTER (WHERE dow IN (0, 6)), 0) as weekend_avg,
  COALESCE(AVG(day_total) FILTER (WHERE dow NOT IN (0, 6)), 0) as weekday_avg
FROM daily
```

### Habit 4: Subscription Bloat

**Definition:** Total recurring monthly charges and identification of potentially forgotten subscriptions.

**Algorithm:**
Reuses recurring detection (Tier 2.1) plus:
1. Sum all active recurring charges for total monthly/annual cost
2. Flag subscriptions where `last_seen` is 45+ days ago as "potentially forgotten"
3. Severity based on count and total:
   - Total > $150/month or count > 8: "high"
   - Total > $80/month or count > 5: "moderate"
   - else: "normal"

### Habit 5: Merchant Concentration

**Definition:** Over-reliance on a small number of merchants (fragility risk, lack of price shopping).

**Algorithm:**
1. Compute each merchant's share of total spending
2. HHI (Herfindahl-Hirschman Index) = sum of squared market shares
3. Score:
   - HHI > 0.25: "high concentration"
   - HHI > 0.15: "moderate"
   - HHI > 0.10: "mild"
   - else: "diversified"

**SQL:**
```sql
WITH merchant_share AS (
  SELECT
    description as merchant,
    SUM(amount::float8) as total,
    SUM(amount::float8) / SUM(SUM(amount::float8)) OVER () as share
  FROM transactions
  WHERE date >= (CURRENT_DATE - interval '90 days')
  GROUP BY description
)
SELECT
  SUM(share * share) as hhi,
  MAX(total) FILTER (WHERE rn = 1) as top_merchant_total,
  MAX(merchant) FILTER (WHERE rn = 1) as top_merchant
FROM (
  SELECT *, ROW_NUMBER() OVER (ORDER BY total DESC) as rn
  FROM merchant_share
) t
```

---

## Implementation Sequencing

### Phase 1: Backend Foundation (Prompt 09)

**Order of implementation within Prompt 09:**

1. **Merchant normalizer service** — foundational, used by all enhanced merchant queries
2. **Database migration** — add `merchant_normalized` column, backfill
3. **Tier 1 enhancements** — modify existing endpoints (summary, monthly, merchants)
4. **New models** — response structs for all new endpoints
5. **Tier 2 endpoints** — implement in order:
   a. `/api/stats/daily` (simplest — single query)
   b. `/api/stats/recurring` (moderate — requires grouping logic)
   c. `/api/stats/anomalies` (moderate — z-score computation)
   d. `/api/stats/forecast` (moderate — multiple projection methods)
   e. `/api/stats/category/{category}` (moderate — category-scoped queries)
   f. `/api/stats/habits` (complex — multiple detectors)
   g. `/api/insights` (complex — orchestrates all other endpoints)

**Rationale:** Start with the normalizer since it improves data quality for everything downstream. Tier 1 changes are surgical edits to existing code. New endpoints build on each other — daily data feeds the heatmap, recurring feeds habits, and insights orchestrates everything.

### Phase 2: Dashboard Enhancements (Prompt 10)

**Depends on:** Prompt 06 (dashboard) + Prompt 09 (enhanced backend)

Enhances the existing dashboard page with the new data. No new pages created — purely enriching what exists. This is high-impact because the dashboard is the first thing users see.

### Phase 3: Advanced Analytics (Prompt 11)

**Depends on:** Prompt 08 (analytics page) + Prompt 09 (enhanced backend)

The biggest frontend change. Adds multiple new sections to the analytics page. Requires the most new components (calendar heatmap, forecast gauge, habits cards, category modal).

### Phase 4: Budget Tracking (Prompt 12) — OPTIONAL

**Depends on:** Prompt 09 (enhanced backend) only

Fully self-contained. Can be skipped entirely — all analytics work on historical averages as implicit baselines. If implemented, budgets sharpen signals (e.g., "85% of dining budget used" vs "25% above average dining").

---

## Technical Reference

### Frontend Types for New Endpoints

```typescript
// Enhanced summary
export interface EnhancedSummaryStats extends SummaryStats {
  mom_change_pct: number | null;
  avg_monthly: number;
  vs_avg_pct: number | null;
  daily_rate: number;
  projected_month_total: number;
  by_category: Array<{
    category: string;
    total: number;
    count: number;
    avg_amount: number;
  }>;
  by_card: Array<{
    card: string;
    total: number;
    count: number;
    avg_amount: number;
  }>;
}

// Enhanced monthly
export interface EnhancedMonthly {
  month: string;
  total: number;
  count: number;
  prev_total: number | null;
  growth_pct: number | null;
  rolling_3mo_avg: number | null;
}

// Enhanced merchants
export interface EnhancedMerchant {
  merchant: string;
  total: number;
  count: number;
  avg_amount: number;
  first_seen: string;
  last_seen: string;
  active_months: number;
  monthly_frequency: number;
}

// Recurring
export interface RecurringTransaction {
  merchant: string;
  avg_amount: number;
  frequency: string;
  active_months: number;
  first_seen: string;
  last_seen: string;
  estimated_annual: number;
  status: "active" | "inactive";
  last_gap_days: number;
  potentially_forgotten: boolean;
}

// Anomalies
export interface CategoryAnomaly {
  category: string;
  current_month: number;
  avg_monthly: number;
  stddev: number;
  z_score: number;
  severity: "elevated" | "high" | "critical";
  pct_above_avg: number;
  message: string;
}

export interface TransactionAnomaly {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  category_avg: number;
  times_avg: number;
  message: string;
}

// Forecast
export interface ForecastData {
  current_month: {
    spent_so_far: number;
    days_elapsed: number;
    days_remaining: number;
    days_in_month: number;
  };
  projections: {
    linear: number;
    day_weighted: number;
    ewma: number;
    recommended: number;
  };
  vs_last_month: {
    last_month_total: number;
    projected_change_pct: number;
  };
  vs_average: {
    avg_monthly: number;
    projected_change_pct: number;
  };
  category_forecasts: Array<{
    category: string;
    spent_so_far: number;
    projected: number;
    avg_monthly: number;
    vs_avg_pct: number;
    trend: "up" | "down" | "stable";
  }>;
  trajectory: "below_average" | "near_average" | "above_average" | "well_above_average";
}

// Habits
export interface HabitsData {
  impulse_spending: {
    score: number;
    label: string;
    small_transaction_pct: number;
    avg_small_amount: number;
    monthly_small_total: number;
    message: string;
  };
  category_creep: Array<{
    category: string;
    trend: "increasing" | "decreasing" | "stable";
    three_month_change_pct: number;
    monthly_totals: number[];
    message: string;
  }>;
  weekend_splurge: {
    weekend_avg_daily: number;
    weekday_avg_daily: number;
    ratio: number;
    label: string;
    message: string;
  };
  subscription_bloat: {
    total_monthly: number;
    total_annual: number;
    count: number;
    potentially_forgotten: string[];
    message: string;
  };
  merchant_concentration: {
    top_merchant: string;
    top_merchant_pct: number;
    top_3_pct: number;
    hhi: number;
    label: string;
    message: string;
  };
}

// Daily (for heatmap)
export interface DailySpending {
  date: string;
  total: number;
  count: number;
}

// Category deep dive
export interface CategoryDeepDive {
  category: string;
  total_spent: number;
  transaction_count: number;
  avg_amount: number;
  monthly_trend: Array<{ month: string; total: number; count: number }>;
  top_merchants: Array<{
    merchant: string;
    total: number;
    count: number;
    avg_amount: number;
  }>;
  day_of_week: Array<{ day: string; day_num: number; total: number; count: number }>;
  recent_transactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
  }>;
}

// Insights
export interface Insight {
  type: "anomaly" | "trend" | "forecast" | "habit" | "recurring" | "milestone" | "positive";
  severity: "low" | "medium" | "high";
  icon: string;
  title: string;
  message: string;
  metric?: {
    value: number;
    comparison: number;
    unit: string;
  };
  action?: string;
  category?: string;
}
```

### API Client Extensions

```typescript
// Add to frontend/src/lib/api.ts:
export async function getRecurring(): Promise<{ data: RecurringData }>
export async function getAnomalies(): Promise<{ data: AnomaliesData }>
export async function getForecast(): Promise<{ data: ForecastData }>
export async function getHabits(): Promise<{ data: HabitsData }>
export async function getDaily(start?: string, end?: string): Promise<{ data: DailySpending[] }>
export async function getCategoryDeepDive(category: string): Promise<{ data: CategoryDeepDive }>
export async function getInsights(): Promise<{ data: Insight[] }>
```

### Design Tokens for Analytics UI

All new UI elements follow the existing design system:

| Element | Color/Style |
|---|---|
| Positive change (spending down) | `#10B981` (green) with `↓` arrow |
| Negative change (spending up) | `#EF4444` (red) with `↑` arrow |
| Neutral/stable | `#6B7280` (gray) with `→` arrow |
| Anomaly elevated | `#F59E0B` (yellow) |
| Anomaly high | `#F97316` (orange) |
| Anomaly critical | `#EF4444` (red) |
| Forecast projection line | Dashed, `#6B7280` opacity 50% |
| Calendar heatmap empty | `#141419` (surface) |
| Calendar heatmap low | `#1E3A2F` |
| Calendar heatmap medium | `#10B981` opacity 50% |
| Calendar heatmap high | `#10B981` opacity 100% |
| Calendar heatmap extreme | `#F59E0B` |
