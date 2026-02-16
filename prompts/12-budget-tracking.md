# Prompt 12: Budget Tracking (Optional)

## Goal
Add an optional budget system that lets users set monthly spending limits by category. Budget progress is shown on the dashboard and analytics page. This feature is entirely self-contained — the app works perfectly without any budgets set. Historical averages remain the default baselines; explicit budgets sharpen signals for users who want tighter control.

**This prompt is optional and can be skipped.** All analytics features from Prompts 09–11 work on historical averages without budgets.

## Prerequisites
- Prompt 9 completed: Enhanced analytics backend with forecast and category data
- Prompt 4 completed: Types, API client, settings page exist

## Design Principles

1. **Zero empty states:** Never show "Set a budget to get started" prompts. If no budgets exist, budget UI simply doesn't appear.
2. **Opt-in only:** Budget configuration lives in Settings. No nudges, banners, or CTAs suggesting users create budgets.
3. **Additive, not replacing:** Budgets add a "used X% of budget" signal alongside existing "X% vs historical average" signals. They don't replace averages.
4. **Graceful degradation:** Every component that shows budget data has a clean fallback for when no budget exists for that category.

## Detailed Tasks

### 1. Database Migration

Add to `backend/src/db.rs` migration function:

```sql
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE,
    monthly_limit NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key constraint:** `category` is UNIQUE — one budget per category. Updating a budget for a category is an upsert.

### 2. Backend Models

**Add to `backend/src/models/` — create `budget.rs`:**

```rust
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
    pub status: String,        // "on_track", "warning", "over_budget"
    pub days_remaining: u32,
}
```

**Module registration:** Add `pub mod budget;` to `backend/src/models/mod.rs`.

### 3. Backend Routes

**Create `backend/src/routes/budget.rs`:**

**Module registration:** Add `pub mod budget;` to `backend/src/routes/mod.rs`. Add `.merge(budget::routes())` to the `api_routes` function.

#### `GET /api/budgets` — List all budgets

```rust
async fn list_budgets(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    let budgets: Vec<Budget> = sqlx::query_as(
        "SELECT id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at \
         FROM budgets ORDER BY category"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({ "data": budgets }))
}
```

Response: `{ "data": [Budget] }`

#### `POST /api/budgets` — Create or update a budget (upsert)

```rust
async fn upsert_budget(
    State(pool): State<PgPool>,
    Json(body): Json<NewBudget>,
) -> Json<serde_json::Value> {
    let result = sqlx::query_as::<_, Budget>(
        "INSERT INTO budgets (category, monthly_limit) \
         VALUES ($1, $2) \
         ON CONFLICT (category) DO UPDATE SET \
           monthly_limit = EXCLUDED.monthly_limit, \
           updated_at = NOW() \
         RETURNING id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at"
    )
    .bind(&body.category)
    .bind(body.monthly_limit)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(budget) => Json(serde_json::json!({ "data": budget })),
        Err(e) => Json(serde_json::json!({ "error": e.to_string() })),
    }
}
```

Request body: `{ "category": "Dining", "monthly_limit": 500.00 }`
Response: `{ "data": Budget }`

#### `DELETE /api/budgets/:id` — Remove a budget

```rust
async fn delete_budget(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<uuid::Uuid>,
) -> Json<serde_json::Value> {
    sqlx::query("DELETE FROM budgets WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .ok();

    Json(serde_json::json!({ "data": "Budget deleted" }))
}
```

#### `GET /api/budgets/progress` — Budget progress for current month

This is the key endpoint. For each budget, compute how much has been spent this month in that category and the projected end-of-month total.

```rust
async fn budget_progress(State(pool): State<PgPool>) -> Json<serde_json::Value> {
    // Get all budgets
    let budgets: Vec<Budget> = sqlx::query_as(
        "SELECT id, category, monthly_limit::float8 as monthly_limit, created_at, updated_at \
         FROM budgets ORDER BY category"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    if budgets.is_empty() {
        return Json(serde_json::json!({ "data": [] }));
    }

    // Get current month spending per category
    let spending: Vec<(String, f64)> = sqlx::query_as(
        "SELECT category, COALESCE(SUM(amount::float8), 0) \
         FROM transactions \
         WHERE date >= date_trunc('month', CURRENT_DATE)::date \
         GROUP BY category"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let spending_map: std::collections::HashMap<String, f64> =
        spending.into_iter().collect();

    // Compute days elapsed and remaining
    let now = chrono::Local::now().naive_local().date();
    let days_elapsed = now.day();
    let days_in_month = if now.month() == 12 {
        chrono::NaiveDate::from_ymd_opt(now.year() + 1, 1, 1)
    } else {
        chrono::NaiveDate::from_ymd_opt(now.year(), now.month() + 1, 1)
    }.unwrap().signed_duration_since(
        chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap()
    ).num_days() as u32;
    let days_remaining = days_in_month.saturating_sub(days_elapsed);

    let progress: Vec<BudgetProgress> = budgets.iter().map(|b| {
        let spent = spending_map.get(&b.category).copied().unwrap_or(0.0);
        let remaining = (b.monthly_limit - spent).max(0.0);
        let pct_used = if b.monthly_limit > 0.0 {
            (spent / b.monthly_limit) * 100.0
        } else { 0.0 };

        // Linear projection
        let projected_spend = if days_elapsed > 0 {
            (spent / days_elapsed as f64) * days_in_month as f64
        } else { 0.0 };
        let projected_pct = if b.monthly_limit > 0.0 {
            (projected_spend / b.monthly_limit) * 100.0
        } else { 0.0 };

        let status = if pct_used >= 100.0 {
            "over_budget".to_string()
        } else if projected_pct >= 90.0 {
            "warning".to_string()
        } else {
            "on_track".to_string()
        };

        BudgetProgress {
            category: b.category.clone(),
            monthly_limit: b.monthly_limit,
            spent,
            remaining,
            pct_used,
            projected_spend,
            projected_pct,
            status,
            days_remaining,
        }
    }).collect();

    Json(serde_json::json!({ "data": progress }))
}
```

Response:
```json
{
  "data": [
    {
      "category": "Dining",
      "monthly_limit": 500.00,
      "spent": 380.00,
      "remaining": 120.00,
      "pct_used": 76.0,
      "projected_spend": 580.00,
      "projected_pct": 116.0,
      "status": "warning",
      "days_remaining": 12
    }
  ]
}
```

**Route registration:**
```rust
pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/budgets", get(list_budgets).post(upsert_budget))
        .route("/budgets/progress", get(budget_progress))
        .route("/budgets/:id", delete(delete_budget))
}
```

**Important:** Register `/budgets/progress` before `/budgets/:id` to avoid path collision.

### 4. Frontend Types

Add to `frontend/src/types/index.ts`:

```typescript
export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetProgress {
  category: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
  pct_used: number;
  projected_spend: number;
  projected_pct: number;
  status: "on_track" | "warning" | "over_budget";
  days_remaining: number;
}
```

### 5. Frontend API Client

Add to `frontend/src/lib/api.ts`:

```typescript
export async function getBudgets(): Promise<{ data: Budget[] }> {
  return fetcher(`${API_BASE}/budgets`);
}

export async function upsertBudget(category: string, monthlyLimit: number): Promise<{ data: Budget }> {
  return fetcher(`${API_BASE}/budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
  });
}

export async function deleteBudget(id: string): Promise<void> {
  await fetcher(`${API_BASE}/budgets/${id}`, { method: "DELETE" });
}

export async function getBudgetProgress(): Promise<{ data: BudgetProgress[] }> {
  return fetcher(`${API_BASE}/budgets/progress`);
}
```

### 6. Settings Page — Budget Management Section

Add a "Budgets" section to the existing settings page (`frontend/src/app/settings/page.tsx`).

**Placement:** Below the existing "Cards" section.

**UI:**

```
┌── Budgets (Optional) ──────────────────────────────────────┐
│                                                              │
│ Set monthly spending limits for categories you want to       │
│ track. Leave empty for categories you don't want to budget.  │
│                                                              │
│ ┌─ Active Budgets ────────────────────────────────────────┐ │
│ │ Dining         $500.00/mo    [Edit] [✕]                 │ │
│ │ Groceries      $800.00/mo    [Edit] [✕]                 │ │
│ │ Gas            $200.00/mo    [Edit] [✕]                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ Add Budget ────────────────────────────────────────────┐ │
│ │ Category: [Subscriptions ▾]  Limit: [$___.__]  [Add]   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
// State
const [budgets, setBudgets] = useState<Budget[]>([]);
const [newCategory, setNewCategory] = useState("");
const [newLimit, setNewLimit] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [editLimit, setEditLimit] = useState("");

// Fetch budgets on mount (add to existing settings fetch)
useEffect(() => {
  getBudgets().then(b => setBudgets(b.data));
}, []);

// Available categories (exclude already-budgeted ones)
const availableCategories = CATEGORIES.filter(
  c => !budgets.some(b => b.category === c)
);
```

**Add budget flow:**
1. Select a category from dropdown (only shows categories without existing budgets)
2. Enter monthly limit in a dollar input
3. Click "Add" → calls `upsertBudget(category, limit)`
4. Budget appears in the list
5. Clear inputs

**Edit budget flow:**
1. Click "Edit" on a budget row
2. Row transforms to show editable limit input
3. Press Enter or click save → calls `upsertBudget(category, newLimit)` (upsert updates)
4. Row returns to display mode

**Delete budget flow:**
1. Click the ✕ button
2. No confirmation needed (not destructive — just removes the budget, not the transactions)
3. Calls `deleteBudget(id)`
4. Row removed from list

**Input formatting:**
- Dollar input: show `$` prefix, allow decimals
- Validate: limit must be > 0
- Format on blur: show 2 decimal places

### 7. Dashboard — Budget Progress Bars (Conditional)

Update `frontend/src/app/dashboard/page.tsx` to conditionally show budget progress.

**Data fetching:** Add `getBudgetProgress()` to the parallel fetch. Store in state.

```typescript
const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);

// In the Promise.all:
getBudgetProgress().then(bp => setBudgetProgress(bp.data)).catch(() => {});
```

**Conditional rendering:** Only show the budget section if `budgetProgress.length > 0`.

**UI — Budget Progress Section:**

Place between the stat cards row and the charts row (or between velocity card and charts if Prompt 10 is done).

```tsx
{budgetProgress.length > 0 && (
  <Card className="mb-6">
    <h3 className="text-sm text-gray-400 mb-4">Budget Progress</h3>
    <div className="space-y-4">
      {budgetProgress
        .sort((a, b) => b.pct_used - a.pct_used) // Most used first
        .map(bp => (
          <div key={bp.category}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white">{bp.category}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-white">
                  {formatCurrency(bp.spent)}
                </span>
                <span className="text-xs text-gray-500">
                  / {formatCurrency(bp.monthly_limit)}
                </span>
                <StatusBadge status={bp.status} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  bp.status === "over_budget" ? "bg-red-500" :
                  bp.status === "warning" ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(bp.pct_used, 100)}%` }}
              />
            </div>

            {/* Projected marker (if not over budget) */}
            {bp.status !== "over_budget" && bp.projected_pct > bp.pct_used && (
              <div className="relative h-0.5 mt-0.5">
                <div className="absolute h-2 w-0.5 bg-gray-500 rounded"
                     style={{ left: `${Math.min(bp.projected_pct, 100)}%` }}
                     title={`Projected: ${formatCurrency(bp.projected_spend)}`} />
              </div>
            )}
          </div>
      ))}
    </div>
  </Card>
)}
```

**StatusBadge component:**
```tsx
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    on_track: "bg-green-500/20 text-green-400",
    warning: "bg-yellow-500/20 text-yellow-400",
    over_budget: "bg-red-500/20 text-red-400",
  };
  const labels: Record<string, string> = {
    on_track: "On Track",
    warning: "Warning",
    over_budget: "Over",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full", styles[status] || "")}>
      {labels[status] || status}
    </span>
  );
}
```

### 8. Analytics Page — Budget Context (Conditional)

If Prompt 11 is completed, add budget context to the category forecast table.

**Update the category risk table** (from Prompt 11's forecasting section) to show budget info when available:

```tsx
// Fetch budget progress along with other analytics data
const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);

// In the Promise.all:
getBudgetProgress().then(bp => setBudgetProgress(bp.data)).catch(() => {});

// Create a lookup map
const budgetMap = new Map(budgetProgress.map(bp => [bp.category, bp]));
```

In the category forecast rows, if a budget exists for that category:

```tsx
<div className="flex items-center gap-2">
  <span className="font-mono text-sm text-white">
    {formatCurrency(cat.projected)}
  </span>
  {budgetMap.has(cat.category) && (
    <span className={cn("text-xs",
      budgetMap.get(cat.category)!.projected_pct > 100 ? "text-red-400" :
      budgetMap.get(cat.category)!.projected_pct > 80 ? "text-yellow-400" : "text-green-400"
    )}>
      {budgetMap.get(cat.category)!.projected_pct.toFixed(0)}% of budget
    </span>
  )}
</div>
```

This is a subtle enhancement — if a budget exists, the forecast row shows how the projection compares to the budget. If no budget exists, nothing changes.

### 9. Integration with Insights (Optional Enhancement)

If the insights engine from Prompt 09 is working, budgets can generate additional insights. This is handled server-side.

**Add to the insights generator in the backend** (optional, can be added to `get_insights`):

```rust
// Budget insights
let budgets: Vec<Budget> = sqlx::query_as(
    "SELECT * FROM budgets"
).fetch_all(&pool).await.unwrap_or_default();

for budget in &budgets {
    let spent = category_spending.get(&budget.category).copied().unwrap_or(0.0);
    let pct = if budget.monthly_limit > 0.0 {
        spent / budget.monthly_limit * 100.0
    } else { 0.0 };

    if pct >= 100.0 {
        scored_insights.push(ScoredInsight {
            insight: Insight {
                r#type: "budget".to_string(),
                severity: "high".to_string(),
                icon: "alert-circle".to_string(),
                title: format!("{} budget exceeded", budget.category),
                message: format!(
                    "You've spent {} on {} this month, exceeding your {} budget.",
                    format_currency(spent), budget.category, format_currency(budget.monthly_limit)
                ),
                metric: Some(serde_json::json!({
                    "value": spent,
                    "comparison": budget.monthly_limit,
                    "unit": "dollars"
                })),
                action: Some(format!("Review {} transactions", budget.category)),
                category: Some(budget.category.clone()),
            },
            priority: 85.0,
        });
    } else if pct >= 80.0 {
        scored_insights.push(ScoredInsight {
            insight: Insight {
                r#type: "budget".to_string(),
                severity: "medium".to_string(),
                icon: "alert-triangle".to_string(),
                title: format!("{} budget at {:.0}%", budget.category, pct),
                message: format!(
                    "{} of {} {} budget used with {} days remaining.",
                    format_currency(spent), format_currency(budget.monthly_limit),
                    budget.category, days_remaining
                ),
                metric: Some(serde_json::json!({
                    "value": spent,
                    "comparison": budget.monthly_limit,
                    "unit": "dollars"
                })),
                action: None,
                category: Some(budget.category.clone()),
            },
            priority: 55.0,
        });
    }
}
```

This is additive — if no budgets exist, no budget insights are generated.

## Verification

### Backend
```bash
# Create budgets
curl -X POST -H "Content-Type: application/json" \
  -d '{"category":"Dining","monthly_limit":500}' \
  localhost:8080/api/budgets

curl -X POST -H "Content-Type: application/json" \
  -d '{"category":"Groceries","monthly_limit":800}' \
  localhost:8080/api/budgets

# List budgets
curl localhost:8080/api/budgets
# → Should show both budgets

# Get progress
curl localhost:8080/api/budgets/progress
# → Should show spent, remaining, pct_used, projected, status for each budget

# Update a budget (upsert)
curl -X POST -H "Content-Type: application/json" \
  -d '{"category":"Dining","monthly_limit":600}' \
  localhost:8080/api/budgets
# → Should update the existing Dining budget to $600

# Delete a budget
curl -X DELETE localhost:8080/api/budgets/<uuid>
# → Budget removed

# Verify no budgets = empty progress
curl -X DELETE localhost:8080/api/budgets/<uuid>
curl localhost:8080/api/budgets/progress
# → Returns empty array
```

### Frontend
1. Navigate to `/settings` — Budget section visible below Cards section
2. **Add budget:** Select "Dining" from dropdown, enter $500, click Add → budget appears in list
3. **Add more:** Add Groceries $800, Gas $200
4. **Edit budget:** Click Edit on Dining → change to $600 → saves correctly
5. **Delete budget:** Click ✕ on Gas → budget removed
6. Navigate to `/dashboard` — **Budget Progress section visible** with progress bars for Dining and Groceries
7. **Progress bars:** Color-coded (green = on track, yellow = warning, red = over)
8. **Status badges:** Show "On Track", "Warning", or "Over" correctly
9. Navigate to `/analytics` — Category forecast table shows "X% of budget" for budgeted categories
10. **Delete all budgets** → Budget sections disappear from dashboard and analytics (no empty states, no broken UI)
11. **No regressions:** All existing functionality works exactly the same with zero budgets
12. Categories dropdown in settings only shows categories without existing budgets
