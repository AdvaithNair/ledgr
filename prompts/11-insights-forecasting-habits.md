# Prompt 11: Insights, Forecasting & Habits — Analytics Page Expansion

## Goal
Major expansion of the analytics page (built in Prompt 08) with forecasting projections, recurring/subscription tracking, behavioral habit analysis, a calendar heatmap, category deep-dive modal, and year-over-year comparison. This transforms the analytics page from descriptive charts into an actionable intelligence dashboard.

## Prerequisites
- Prompt 8 completed: Analytics page exists with category trends, day patterns, monthly accordion, and billing periods
- Prompt 9 completed: All new backend endpoints work (`/api/stats/forecast`, `/api/stats/recurring`, `/api/stats/habits`, `/api/stats/daily`, `/api/stats/category/{category}`, `/api/stats/anomalies`)
- Prompt 4 completed: Types, API client, constants, Recharts theme exist

## Updated Types (`frontend/src/types/index.ts`)

Add all remaining analytics types (if not already added in Prompt 10). See `docs/analytics-features.md` "Technical Reference" section for full definitions. Key additions:

```typescript
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

export interface RecurringData {
  recurring: RecurringTransaction[];
  total_monthly_recurring: number;
  total_annual_recurring: number;
}

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
    trend: string;
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

export interface DailySpending {
  date: string;
  total: number;
  count: number;
}

export interface CategoryDeepDive {
  category: string;
  total_spent: number;
  transaction_count: number;
  avg_amount: number;
  monthly_trend: Array<{ month: string; total: number; count: number }>;
  top_merchants: Array<{ merchant: string; total: number; count: number; avg_amount: number }>;
  day_of_week: Array<{ day: string; day_num: number; total: number; count: number }>;
  recent_transactions: Array<{ id: string; date: string; description: string; amount: number }>;
}

export interface ForecastData {
  current_month: { spent_so_far: number; days_elapsed: number; days_remaining: number; days_in_month: number };
  projections: { linear: number; day_weighted: number; ewma: number; recommended: number };
  vs_last_month: { last_month_total: number; projected_change_pct: number };
  vs_average: { avg_monthly: number; projected_change_pct: number };
  category_forecasts: Array<{
    category: string; spent_so_far: number; projected: number;
    avg_monthly: number; vs_avg_pct: number; trend: "up" | "down" | "stable";
  }>;
  trajectory: string;
}
```

## Updated API Client (`frontend/src/lib/api.ts`)

Add new API functions (if not already added in Prompt 10):

```typescript
export async function getRecurring(): Promise<{ data: RecurringData }> {
  return fetcher(`${API_BASE}/stats/recurring`);
}

export async function getHabits(): Promise<{ data: HabitsData }> {
  return fetcher(`${API_BASE}/stats/habits`);
}

export async function getDaily(startDate?: string, endDate?: string): Promise<{ data: DailySpending[] }> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return fetcher(`${API_BASE}/stats/daily?${params}`);
}

export async function getCategoryDeepDive(category: string): Promise<{ data: CategoryDeepDive }> {
  return fetcher(`${API_BASE}/stats/category/${encodeURIComponent(category)}`);
}

export async function getForecast(): Promise<{ data: ForecastData }> {
  return fetcher(`${API_BASE}/stats/forecast`);
}
```

## Page Update: `frontend/src/app/analytics/page.tsx`

### Updated Data Fetching

Add the new data sources to the parallel fetch on mount:

```typescript
const [monthly, setMonthly] = useState<MonthlyData | null>(null);
const [patterns, setPatterns] = useState<PatternData | null>(null);
const [cards, setCards] = useState<Card[]>([]);
const [forecast, setForecast] = useState<ForecastData | null>(null);
const [recurring, setRecurring] = useState<RecurringData | null>(null);
const [habits, setHabits] = useState<HabitsData | null>(null);
const [daily, setDaily] = useState<DailySpending[]>([]);
const [loading, setLoading] = useState(true);

// Category deep dive (loaded on demand)
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [categoryData, setCategoryData] = useState<CategoryDeepDive | null>(null);
const [categoryLoading, setCategoryLoading] = useState(false);

useEffect(() => {
  Promise.all([
    getMonthly(), getPatterns(), getCards(),
    getForecast(), getRecurring(), getHabits(), getDaily()
  ])
    .then(([m, p, c, f, r, h, d]) => {
      setMonthly(m.data);
      setPatterns(p.data);
      setCards(c.data);
      setForecast(f.data);
      setRecurring(r.data);
      setHabits(h.data);
      setDaily(d.data);
    })
    .finally(() => setLoading(false));
}, []);

// Category deep dive loader
const openCategoryDeepDive = async (category: string) => {
  setSelectedCategory(category);
  setCategoryLoading(true);
  try {
    const res = await getCategoryDeepDive(category);
    setCategoryData(res.data);
  } finally {
    setCategoryLoading(false);
  }
};
```

### Updated UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Analytics                                                         │
│ Deep dive into your spending patterns                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌── Forecasting Section ─────────────────────────────────────┐  │
│ │                                                             │  │
│ │ ┌── End-of-Month Projection ─┐ ┌── Category Risk Table ─┐ │  │
│ │ │                             │ │                         │ │  │
│ │ │   $3,050 projected         │ │ Dining    ↑ $827  +38% │ │  │
│ │ │   ████████████░░░░░░       │ │ Groceries → $650   +2% │ │  │
│ │ │   avg: $2,650              │ │ Gas       ↓ $280  -12% │ │  │
│ │ │                             │ │ ...                     │ │  │
│ │ └─────────────────────────────┘ └─────────────────────────┘ │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Category Trends (existing, enhanced) ────────────────────┐  │
│ │ Stacked area chart with clickable legend items              │  │
│ │ Click any category → opens deep dive modal                  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Calendar Heatmap ────────────────────────────────────────┐  │
│ │ Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec │  │
│ │ ░░▓▓░░▓███░░▓▓░░▓▓░░██░░▓▓░░▓▓░░██░░▓▓░░▓▓░░██░░▓▓░░▓▓ │  │
│ │ ░░▓▓░░▓▓░░▓▓░░▓▓░░██░░▓▓░░▓▓░░██░░▓▓░░▓▓░░██░░▓▓░░▓▓░░ │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Day-of-Week ────────┐ ┌── Day-of-Month ─────────────────┐  │
│ │ (existing)             │ │ (existing)                       │  │
│ └────────────────────────┘ └─────────────────────────────────┘  │
│                                                                   │
│ ┌── Recurring / Subscriptions ───────────────────────────────┐  │
│ │ Total: $89.95/month ($1,079/year)                          │  │
│ │                                                             │  │
│ │ ● NETFLIX.COM        $15.99/mo  Active    8 months         │  │
│ │ ● SPOTIFY            $9.99/mo   Active    12 months        │  │
│ │ ⚠ GYM MEMBERSHIP    $29.99/mo  Inactive  Last: 45d ago   │  │
│ │ ...                                                         │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Bad Habits ──────────────────────────────────────────────┐  │
│ │                                                             │  │
│ │ ┌─ Impulse ──┐ ┌─ Weekend ──┐ ┌─ Concentration ─────────┐│  │
│ │ │ Score: 0.35│ │ 85% more  │ │ Top 3: 48% of spending  ││  │
│ │ │ Moderate   │ │ on wknds  │ │ Moderate concentration   ││  │
│ │ └────────────┘ └────────────┘ └──────────────────────────┘│  │
│ │                                                             │  │
│ │ ┌─ Category Creep ───────────────────────────────────────┐ │  │
│ │ │ Dining ↑ +25% over 3 months    ████████████████████░░ │ │  │
│ │ │ Shopping ↑ +18% over 3 months  ██████████████████░░░░ │ │  │
│ │ └───────────────────────────────────────────────────────┘ │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Year-over-Year Comparison ───────────────────────────────┐  │
│ │ Grouped bar chart comparing months across years             │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Monthly Breakdown Accordion (existing) ──────────────────┐  │
│                                                                   │
│ ┌── Billing Period View (existing) ──────────────────────────┐  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### New Sections — Detailed Implementation

#### 1. Forecasting Section

Two side-by-side cards at the top of the page.

**Left: End-of-Month Projection Card**

```tsx
<Card>
  <h3 className="text-sm text-gray-400 mb-4">End-of-Month Projection</h3>

  {/* Main projection number */}
  <p className="font-mono text-3xl text-white mb-1">
    {formatCurrency(forecast.projections.recommended)}
  </p>
  <p className="text-xs text-gray-500 mb-4">
    Blended projection from {forecast.current_month.days_elapsed} days of data
  </p>

  {/* Projection gauge */}
  <div className="relative h-3 bg-border rounded-full overflow-hidden mb-2">
    {/* Average marker */}
    <div className="absolute top-0 h-full w-0.5 bg-gray-500 z-10"
         style={{ left: `${Math.min((forecast.vs_average.avg_monthly / maxValue) * 100, 100)}%` }} />
    {/* Projection bar */}
    <div className={cn("h-full rounded-full",
      forecast.trajectory === "below_average" ? "bg-green-500" :
      forecast.trajectory === "near_average" ? "bg-yellow-500" :
      forecast.trajectory === "above_average" ? "bg-orange-500" : "bg-red-500"
    )}
    style={{ width: `${Math.min((forecast.projections.recommended / maxValue) * 100, 100)}%` }} />
  </div>
  <div className="flex justify-between text-xs text-gray-500">
    <span>$0</span>
    <span>Avg: {formatCurrency(forecast.vs_average.avg_monthly)}</span>
  </div>

  {/* Comparison stats */}
  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
    <div>
      <p className="text-xs text-gray-500">vs Last Month</p>
      <p className={cn("text-sm font-mono",
        forecast.vs_last_month.projected_change_pct > 0 ? "text-red-400" : "text-green-400"
      )}>
        {forecast.vs_last_month.projected_change_pct > 0 ? "+" : ""}
        {forecast.vs_last_month.projected_change_pct.toFixed(1)}%
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500">vs Average</p>
      <p className={cn("text-sm font-mono",
        forecast.vs_average.projected_change_pct > 0 ? "text-red-400" : "text-green-400"
      )}>
        {forecast.vs_average.projected_change_pct > 0 ? "+" : ""}
        {forecast.vs_average.projected_change_pct.toFixed(1)}%
      </p>
    </div>
  </div>
</Card>
```

**Right: Category Risk Table**

Shows per-category forecasts with trend indicators.

```tsx
<Card>
  <h3 className="text-sm text-gray-400 mb-4">Category Forecast</h3>
  <div className="space-y-3">
    {forecast.category_forecasts
      .sort((a, b) => Math.abs(b.vs_avg_pct) - Math.abs(a.vs_avg_pct))
      .map(cat => (
        <div key={cat.category}
             className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-white/5 rounded px-2 -mx-2"
             onClick={() => openCategoryDeepDive(cat.category)}>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm",
              cat.trend === "up" ? "text-red-400" : cat.trend === "down" ? "text-green-400" : "text-gray-400"
            )}>
              {cat.trend === "up" ? "↑" : cat.trend === "down" ? "↓" : "→"}
            </span>
            <span className="text-sm text-white">{cat.category}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-white">
              {formatCurrency(cat.projected)}
            </span>
            <span className={cn("text-xs",
              cat.vs_avg_pct > 0 ? "text-red-400" : "text-green-400"
            )}>
              {cat.vs_avg_pct > 0 ? "+" : ""}{cat.vs_avg_pct.toFixed(0)}%
            </span>
          </div>
        </div>
    ))}
  </div>
</Card>
```

Categories are clickable → opens the category deep dive modal.

#### 2. Calendar Heatmap

GitHub-style daily spending visualization. Shows the last 365 days (or all available data).

**Implementation approach:**

Build a grid where:
- Columns = weeks (52–53 columns)
- Rows = days of week (7 rows, Sun–Sat)
- Each cell = one day, colored by spending intensity

**Data transformation:**
```typescript
function buildHeatmapData(daily: DailySpending[]) {
  // Create a map of date string → total
  const dateMap = new Map(daily.map(d => [d.date, d.total]));

  // Find min and max totals for color scaling
  const totals = daily.map(d => d.total).filter(t => t > 0);
  const maxTotal = Math.max(...totals, 1);
  const p75 = totals.sort((a, b) => a - b)[Math.floor(totals.length * 0.75)] || maxTotal;

  // Generate all dates for the last 365 days
  // Group into weeks (columns)
  // Each cell: { date, total, intensity: 0-4 }
  // intensity: 0 = no spending, 1-4 = quartile-based
}
```

**Color scale:**
- Level 0 (no data / $0): `#141419` (surface)
- Level 1 (low): `#1E3A2F` (dark green)
- Level 2 (moderate): `rgba(16, 185, 129, 0.4)` (green 40%)
- Level 3 (high): `rgba(16, 185, 129, 0.7)` (green 70%)
- Level 4 (very high): `#10B981` (full green)
- Level 5 (extreme outlier): `#F59E0B` (amber — signals anomaly)

Determine intensity based on percentile of the spending distribution (using quartiles from historical data).

**Rendering:**
```tsx
<Card>
  <h3 className="text-sm text-gray-400 mb-4">Daily Spending</h3>

  {/* Month labels */}
  <div className="flex gap-[3px] mb-1 ml-8">
    {monthLabels.map(label => (
      <span key={label.month} className="text-xs text-gray-500"
            style={{ width: label.weeks * 13 }}>
        {label.name}
      </span>
    ))}
  </div>

  <div className="flex gap-1">
    {/* Day labels */}
    <div className="flex flex-col gap-[3px]">
      {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
        <span key={i} className="text-xs text-gray-500 h-[10px] leading-[10px]">{d}</span>
      ))}
    </div>

    {/* Grid */}
    <div className="flex gap-[3px]">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              className="w-[10px] h-[10px] rounded-sm cursor-pointer"
              style={{ backgroundColor: intensityColors[day.intensity] }}
              title={`${day.date}: ${formatCurrency(day.total)}`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>

  {/* Legend */}
  <div className="flex items-center gap-1 mt-3 justify-end">
    <span className="text-xs text-gray-500">Less</span>
    {intensityColors.map((color, i) => (
      <div key={i} className="w-[10px] h-[10px] rounded-sm" style={{ backgroundColor: color }} />
    ))}
    <span className="text-xs text-gray-500">More</span>
  </div>
</Card>
```

**Tooltip:** On hover, show the date and total amount. Use the native `title` attribute for simplicity, or a custom tooltip component for richer styling.

#### 3. Recurring / Subscriptions Section

Shows detected recurring transactions with cost summaries and status indicators.

```tsx
<Card>
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-sm text-gray-400">Recurring & Subscriptions</h3>
    <div className="text-right">
      <p className="font-mono text-lg text-white">
        {formatCurrency(recurring.total_monthly_recurring)}/mo
      </p>
      <p className="text-xs text-gray-500">
        {formatCurrency(recurring.total_annual_recurring)}/year
      </p>
    </div>
  </div>

  <div className="space-y-2">
    {recurring.recurring.map(item => (
      <div key={item.merchant}
           className={cn(
             "flex items-center justify-between py-3 px-3 rounded-lg border",
             item.potentially_forgotten
               ? "border-yellow-500/30 bg-yellow-500/5"
               : "border-border"
           )}>
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full",
            item.status === "active" ? "bg-green-500" : "bg-yellow-500"
          )} />
          <div>
            <p className="text-sm text-white">{item.merchant}</p>
            <p className="text-xs text-gray-500">
              {item.active_months} months · Since {formatDate(item.first_seen)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-white">
            {formatCurrency(item.avg_amount)}/mo
          </p>
          {item.potentially_forgotten && (
            <p className="text-xs text-yellow-400">
              Last seen {item.last_gap_days} days ago
            </p>
          )}
        </div>
      </div>
    ))}
  </div>

  {recurring.recurring.length === 0 && (
    <p className="text-sm text-gray-500 text-center py-4">
      Not enough data to detect recurring transactions yet
    </p>
  )}
</Card>
```

**Key details:**
- Active subscriptions get a green dot, inactive get yellow
- Potentially forgotten subscriptions get a yellow-tinted background and warning text
- Show annual cost in header for impact awareness
- If no recurring transactions detected (insufficient data), show helpful message

#### 4. Bad Habits Section

Five habit detectors displayed as a grid of insight cards.

**Top row: Three summary cards**

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
  {/* Impulse Spending */}
  <Card>
    <div className="flex justify-between items-start mb-2">
      <h4 className="text-sm text-gray-400">Impulse Spending</h4>
      <HabitBadge label={habits.impulse_spending.label} />
    </div>
    <p className="font-mono text-2xl text-white mb-1">
      {habits.impulse_spending.small_transaction_pct.toFixed(0)}%
    </p>
    <p className="text-xs text-gray-500">
      of transactions under $15
    </p>
    <p className="text-xs text-gray-400 mt-2">
      {habits.impulse_spending.message}
    </p>
  </Card>

  {/* Weekend Splurge */}
  <Card>
    <div className="flex justify-between items-start mb-2">
      <h4 className="text-sm text-gray-400">Weekend Spending</h4>
      <HabitBadge label={habits.weekend_splurge.label} />
    </div>
    <p className="font-mono text-2xl text-white mb-1">
      {((habits.weekend_splurge.ratio - 1) * 100).toFixed(0)}%
    </p>
    <p className="text-xs text-gray-500">
      more on weekends
    </p>
    <div className="flex gap-4 mt-3 text-xs">
      <div>
        <span className="text-gray-500">Weekday: </span>
        <span className="font-mono text-white">
          {formatCurrency(habits.weekend_splurge.weekday_avg_daily)}/day
        </span>
      </div>
      <div>
        <span className="text-gray-500">Weekend: </span>
        <span className="font-mono text-white">
          {formatCurrency(habits.weekend_splurge.weekend_avg_daily)}/day
        </span>
      </div>
    </div>
  </Card>

  {/* Merchant Concentration */}
  <Card>
    <div className="flex justify-between items-start mb-2">
      <h4 className="text-sm text-gray-400">Merchant Concentration</h4>
      <HabitBadge label={habits.merchant_concentration.label} />
    </div>
    <p className="font-mono text-2xl text-white mb-1">
      {habits.merchant_concentration.top_3_pct.toFixed(0)}%
    </p>
    <p className="text-xs text-gray-500">
      at your top 3 merchants
    </p>
    <p className="text-xs text-gray-400 mt-2">
      #1: {habits.merchant_concentration.top_merchant}
      ({habits.merchant_concentration.top_merchant_pct.toFixed(0)}%)
    </p>
  </Card>
</div>
```

**HabitBadge component:**
```tsx
function HabitBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    minimal: "bg-green-500/20 text-green-400",
    low: "bg-green-500/20 text-green-400",
    slight: "bg-yellow-500/20 text-yellow-400",
    moderate: "bg-yellow-500/20 text-yellow-400",
    balanced: "bg-green-500/20 text-green-400",
    high: "bg-red-500/20 text-red-400",
    diversified: "bg-green-500/20 text-green-400",
    mild: "bg-yellow-500/20 text-yellow-400",
    normal: "bg-green-500/20 text-green-400",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full", colors[label] || "bg-gray-500/20 text-gray-400")}>
      {label}
    </span>
  );
}
```

**Bottom row: Category Creep section**

```tsx
<Card>
  <h4 className="text-sm text-gray-400 mb-3">Category Creep</h4>
  {habits.category_creep.length > 0 ? (
    <div className="space-y-3">
      {habits.category_creep.map(cat => (
        <div key={cat.category} className="flex items-center gap-4">
          <div className="w-24">
            <p className="text-sm text-white">{cat.category}</p>
            <p className="text-xs text-red-400">
              ↑ +{cat.three_month_change_pct.toFixed(0)}%
            </p>
          </div>
          {/* Mini sparkline of monthly_totals */}
          <div className="flex-1 flex items-end gap-1 h-8">
            {cat.monthly_totals.map((total, i) => (
              <div
                key={i}
                className="flex-1 bg-red-500/40 rounded-sm"
                style={{
                  height: `${(total / Math.max(...cat.monthly_totals)) * 100}%`,
                  opacity: 0.4 + (i / cat.monthly_totals.length) * 0.6,
                }}
              />
            ))}
          </div>
          <p className="font-mono text-sm text-white w-20 text-right">
            {formatCurrency(cat.monthly_totals[cat.monthly_totals.length - 1])}/mo
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-gray-500 text-center py-2">
      No significant spending increases detected
    </p>
  )}
</Card>
```

#### 5. Category Deep Dive Modal

A modal that opens when clicking any category in the category trends chart legend, the category risk table, or the monthly accordion category bars.

**Trigger:** Call `openCategoryDeepDive(categoryName)` which sets `selectedCategory` and fetches data.

**Modal content:**

```tsx
{selectedCategory && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
       onClick={() => setSelectedCategory(null)}>
    <div className="bg-bg border border-border rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6"
         onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-medium text-white">{categoryData?.category}</h2>
          <p className="text-sm text-gray-400">Category deep dive</p>
        </div>
        <button onClick={() => setSelectedCategory(null)}
                className="text-gray-400 hover:text-white text-xl">✕</button>
      </div>

      {categoryLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      ) : categoryData && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface rounded-lg p-4">
              <p className="text-xs text-gray-500">Total Spent</p>
              <p className="font-mono text-xl text-white">{formatCurrency(categoryData.total_spent)}</p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="font-mono text-xl text-white">{categoryData.transaction_count}</p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-xs text-gray-500">Avg Amount</p>
              <p className="font-mono text-xl text-white">{formatCurrency(categoryData.avg_amount)}</p>
            </div>
          </div>

          {/* Monthly trend line chart */}
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={categoryData.monthly_trend}>
                <CartesianGrid {...CHART_THEME.grid} />
                <XAxis dataKey="month" {...CHART_THEME.axis}
                       tickFormatter={m => formatMonthShort(m)} />
                <YAxis {...CHART_THEME.axis}
                       tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_THEME.tooltip} />
                <Area type="monotone" dataKey="total"
                      stroke={CATEGORY_COLORS[categoryData.category] || "#6B7280"}
                      fill={CATEGORY_COLORS[categoryData.category] || "#6B7280"}
                      fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top merchants in this category */}
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3">Top Merchants</h3>
            <div className="space-y-2">
              {categoryData.top_merchants.map((m, i) => (
                <div key={m.merchant} className="flex justify-between items-center py-2">
                  <div>
                    <span className="text-gray-500 text-sm mr-2">{i + 1}.</span>
                    <span className="text-white text-sm">{m.merchant}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm text-white">{formatCurrency(m.total)}</span>
                    <span className="text-xs text-gray-500 ml-2">({m.count} txns)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day-of-week pattern for this category */}
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3">Day-of-Week Pattern</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={categoryData.day_of_week}>
                <CartesianGrid {...CHART_THEME.grid} />
                <XAxis dataKey="day" {...CHART_THEME.axis} />
                <YAxis {...CHART_THEME.axis} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_THEME.tooltip} />
                <Bar dataKey="total"
                     fill={CATEGORY_COLORS[categoryData.category] || "#6B7280"}
                     radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent transactions */}
          <div>
            <h3 className="text-sm text-gray-400 mb-3">Recent Transactions</h3>
            <div className="space-y-1">
              {categoryData.recent_transactions.map(txn => (
                <div key={txn.id} className="flex justify-between py-2 text-sm border-b border-border last:border-0">
                  <div>
                    <span className="text-gray-500">{formatDate(txn.date)}</span>
                    <span className="text-white ml-3">{txn.description}</span>
                  </div>
                  <span className="font-mono text-white">{formatCurrency(txn.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)}
```

**Integration points:** Make categories clickable in:
- Category trends chart legend (add `onClick` to legend items)
- Category risk table rows (already set up with `onClick`)
- Monthly accordion category bars

#### 6. Year-over-Year Comparison Chart

Grouped bar chart comparing the same months across different years.

**Data transformation:**
```typescript
function buildYoYData(monthly: MonthlyData) {
  // Group months by month-number (1-12), with separate bars per year
  // Input: [{ month: "2025-01", total: 3000 }, { month: "2026-01", total: 3200 }, ...]
  // Output: [{ month: "Jan", "2025": 3000, "2026": 3200 }, ...]

  const years = new Set<string>();
  const byMonth: Record<string, Record<string, number>> = {};

  for (const m of monthly.monthly) {
    const [year, monthNum] = m.month.split("-");
    years.add(year);
    const monthName = new Date(2000, parseInt(monthNum) - 1).toLocaleString("default", { month: "short" });
    if (!byMonth[monthName]) byMonth[monthName] = {};
    byMonth[monthName][year] = m.total;
  }

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    data: monthOrder
      .filter(m => byMonth[m])
      .map(m => ({ month: m, ...byMonth[m] })),
    years: Array.from(years).sort(),
  };
}
```

**Chart implementation:**
```tsx
<Card>
  <h3 className="text-sm text-gray-400 mb-4">Year-over-Year</h3>
  {yoyData.years.length >= 2 ? (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={yoyData.data}>
        <CartesianGrid {...CHART_THEME.grid} />
        <XAxis dataKey="month" {...CHART_THEME.axis} />
        <YAxis {...CHART_THEME.axis} tickFormatter={v => `$${v}`} />
        <Tooltip {...CHART_THEME.tooltip} />
        <Legend />
        {yoyData.years.map((year, i) => (
          <Bar key={year} dataKey={year}
               fill={yearColors[i % yearColors.length]}
               radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <p className="text-sm text-gray-500 text-center py-8">
      Need at least 2 years of data for comparison
    </p>
  )}
</Card>
```

**Year colors:** Use distinct but harmonious colors:
```typescript
const yearColors = ["#6B7280", "#3B82F6", "#10B981", "#F59E0B"];
// Oldest year = gray, newer years = more vibrant
```

Only show this section if there are at least 2 distinct years in the data. If only 1 year, show a helpful message.

### Enhanced Existing Sections

#### Category Trends Chart — Add Clickability

Update the category trends stacked area chart legend to make categories clickable:

```tsx
<Legend
  content={({ payload }) => (
    <div className="flex flex-wrap gap-2 mt-2 justify-center">
      {payload?.map(entry => (
        <button
          key={entry.value}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          onClick={() => openCategoryDeepDive(entry.value)}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </button>
      ))}
    </div>
  )}
/>
```

### Loading States

- Forecasting section: Two skeleton cards side by side
- Calendar heatmap: Skeleton block matching heatmap dimensions
- Recurring section: 3 skeleton rows
- Habits section: 3 skeleton cards in a row
- YoY chart: Skeleton chart block
- Category deep dive modal: Loading skeleton inside modal while data fetches

### Animations

- Section cards: stagger fade-in with Framer Motion (same pattern as Prompt 08)
- Calendar heatmap cells: subtle fade-in
- Habits score numbers: count-up animation on first render
- Category creep mini-bars: animate height from 0
- Modal: fade + scale-up entrance, fade + scale-down exit with `AnimatePresence`

### Responsive

- Forecasting section: 2-column on desktop (`grid-cols-1 lg:grid-cols-2`), stacked on mobile
- Habits cards: 3-column on desktop, stacked on mobile
- Calendar heatmap: horizontal scroll on mobile if needed
- Category deep dive modal: max-w-3xl, full width on mobile with less padding
- YoY chart: full width, responsive height

## Verification

1. Navigate to `/analytics` with data imported
2. **Forecasting:** End-of-month projection displayed with gauge bar and comparison stats
3. **Category risk table:** All categories listed with trend arrows and projected amounts; clicking a category opens the deep dive modal
4. **Calendar heatmap:** GitHub-style grid of daily spending, colored by intensity, hovering shows date + amount
5. **Recurring:** Detected subscriptions listed with monthly/annual costs; active subscriptions show green dot, potentially forgotten show yellow warning
6. **Habits — Impulse:** Shows percentage of small transactions and monthly cost
7. **Habits — Weekend:** Shows weekend vs weekday ratio
8. **Habits — Concentration:** Shows top 3 merchant share percentage
9. **Habits — Category creep:** Lists categories with increasing trends and mini sparklines
10. **Category deep dive modal:** Click any category → modal opens with trend chart, top merchants, day-of-week pattern, recent transactions
11. **Year-over-year:** Grouped bars comparing same months across years (only if 2+ years of data)
12. **Existing sections still work:** Category trends, day-of-week, day-of-month, monthly accordion, billing periods all unchanged
13. **Loading states:** Skeletons show for all new sections while data loads
14. **Responsive:** Everything stacks properly on mobile
15. **No console errors or TypeScript warnings**
