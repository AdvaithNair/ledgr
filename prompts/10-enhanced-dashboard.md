# Prompt 10: Enhanced Dashboard

## Goal
Upgrade the dashboard (built in Prompt 06) to use the enhanced backend data from Prompt 09. Add month-over-month change indicators, spending velocity card, smart insights carousel, anomaly alert banner, enhanced merchant list, and a spending projection gauge. The dashboard transforms from a static summary into a dynamic command center.

## Prerequisites
- Prompt 6 completed: Dashboard page exists with hero stat, stat cards, monthly trend chart, category donut, card comparison, and top merchants
- Prompt 9 completed: Enhanced summary, monthly, and merchants endpoints return trend data; `/api/insights`, `/api/stats/forecast`, `/api/stats/anomalies` endpoints work
- Prompt 4 completed: Types, API client, constants exist

## Updated Types (`frontend/src/types/index.ts`)

Add the new types needed for this prompt. See `docs/analytics-features.md` "Technical Reference" section for the full type definitions. At minimum, add:

```typescript
// Extend existing SummaryStats or create EnhancedSummaryStats
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
  vs_last_month: { last_month_total: number; projected_change_pct: number };
  vs_average: { avg_monthly: number; projected_change_pct: number };
  category_forecasts: Array<{
    category: string;
    spent_so_far: number;
    projected: number;
    avg_monthly: number;
    vs_avg_pct: number;
    trend: "up" | "down" | "stable";
  }>;
  trajectory: string;
}

export interface Insight {
  type: string;
  severity: "low" | "medium" | "high";
  icon: string;
  title: string;
  message: string;
  metric?: { value: number; comparison: number; unit: string };
  action?: string;
  category?: string;
}

export interface CategoryAnomaly {
  category: string;
  current_month: number;
  avg_monthly: number;
  z_score: number;
  severity: "elevated" | "high" | "critical";
  pct_above_avg: number;
  message: string;
}
```

## Updated API Client (`frontend/src/lib/api.ts`)

Add new API functions:

```typescript
export async function getForecast(): Promise<{ data: ForecastData }> {
  return fetcher(`${API_BASE}/stats/forecast`);
}

export async function getInsights(): Promise<{ data: Insight[] }> {
  return fetcher(`${API_BASE}/insights`);
}

export async function getAnomalies(): Promise<{ data: { category_anomalies: CategoryAnomaly[]; transaction_anomalies: any[] } }> {
  return fetcher(`${API_BASE}/stats/anomalies`);
}
```

## Page Updates: `frontend/src/app/dashboard/page.tsx`

### Updated Data Fetching

Add forecast, insights, and anomalies to the parallel fetch:

```typescript
const [summary, setSummary] = useState<EnhancedSummaryStats | null>(null);
const [monthly, setMonthly] = useState<MonthlyData | null>(null);
const [merchants, setMerchants] = useState<EnhancedMerchant[] | null>(null);
const [cards, setCards] = useState<Card[]>([]);
const [forecast, setForecast] = useState<ForecastData | null>(null);
const [insights, setInsights] = useState<Insight[] | null>(null);
const [anomalies, setAnomalies] = useState<CategoryAnomaly[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([
    getSummary(), getMonthly(), getMerchants(), getCards(),
    getForecast(), getInsights(), getAnomalies()
  ])
    .then(([s, m, mer, c, f, ins, a]) => {
      setSummary(s.data as EnhancedSummaryStats);
      setMonthly(m.data);
      setMerchants(mer.data as EnhancedMerchant[]);
      setCards(c.data);
      setForecast(f.data);
      setInsights(ins.data);
      setAnomalies(a.data.category_anomalies || []);
    })
    .finally(() => setLoading(false));
}, []);
```

### Updated UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard                                                         │
│ Your spending at a glance                    [This Month ▾]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌── Anomaly Alert Banner (if any anomalies) ─────────────────┐  │
│ │ ⚠ Dining spending is 2x your average this month            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Insights Carousel ──────────────────────────────────────┐   │
│ │ [◀] "Dining doubled" │ "On pace for $3.1k" │ "New high" [▶] │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌── Hero Stat ───────────────────────────────────────────────┐  │
│ │              $12,345.67                                     │  │
│ │              Total Spending · 456 transactions              │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Stat Cards Row ──────────────────────────────────────────┐  │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│  │
│ │ │This Month    │ │Last Month    │ │Avg per Month         ││  │
│ │ │$2,345.67     │ │$3,456.78     │ │$2,650.00             ││  │
│ │ │ ↓ 32% MoM   │ │              │ │                       ││  │
│ │ │ ↑ 12% vs avg│ │              │ │                       ││  │
│ │ └──────────────┘ └──────────────┘ └──────────────────────┘│  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌── Spending Velocity ──────────────────────────────────────┐   │
│ │ Daily Rate: $78.50/day    Projected: $2,433     Avg: $2,650 │   │
│ │ ████████████████████░░░░░░░░ 72% of month elapsed          │   │
│ │ ██████████████████░░░░░░░░░░ 92% of projected spending     │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌── Monthly Trend ──────────────┐ ┌── Categories ──────────┐   │
│ │ (same as before, enhanced)     │ │ (same as before)        │   │
│ └────────────────────────────────┘ └────────────────────────┘   │
│                                                                   │
│ ┌── Card Comparison (same as before) ────────────────────────┐  │
│                                                                   │
│ ┌── Top Merchants (enhanced) ────────────────────────────────┐  │
│ │ 1. COSTCO        $2,345.67  15 txns  ~$156/txn  8 months  │  │
│ │ 2. WHOLE FOODS   $1,234.56  28 txns  ~$44/txn   6 months  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Detailed Component Changes

#### 1. Anomaly Alert Banner (New)

Show at the very top of the dashboard content area, above insights and hero stat.

- Only renders if `anomalies.length > 0`
- Shows the highest-severity anomaly as the primary alert
- If multiple anomalies, show count: "and 2 more unusual patterns"
- Color-coded by severity:
  - `elevated`: yellow/amber border-left accent, subtle yellow background
  - `high`: orange border-left accent
  - `critical`: red border-left accent, slightly more prominent
- Dismissible (X button, local state only — don't persist)
- Content: anomaly message from the API (e.g., "Dining spending is 2x your monthly average")
- Optional "View Details" link → `/analytics`

```tsx
// Component structure
<div className="border-l-4 rounded-lg p-4 mb-6"
     style={{ borderColor: severityColor, backgroundColor: severityBg }}>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <WarningIcon />
      <div>
        <p className="font-medium text-white">{topAnomaly.message}</p>
        {anomalies.length > 1 && (
          <p className="text-sm text-gray-400">and {anomalies.length - 1} more unusual patterns</p>
        )}
      </div>
    </div>
    <button onClick={dismiss}>✕</button>
  </div>
</div>
```

#### 2. Insights Carousel (New)

Horizontal scrollable row of 3–5 insight cards, positioned below the alert banner and above the hero stat.

**Each insight card:**
- Fixed width (~280px), min-height
- Background: `bg-surface` with `border-border`
- Left accent bar colored by severity (green for positive, yellow for medium, red for high)
- Icon (mapped from `insight.icon` string — use simple Unicode or SVG):
  - `"alert-triangle"` → ⚠
  - `"trending-up"` → ↗
  - `"trending-down"` → ↘
  - `"dollar-sign"` → $
  - `"repeat"` → ↻
  - `"check-circle"` → ✓
- Title: bold, single line
- Message: 2 lines max, text-sm, muted
- If `metric` exists, show the key number prominently in `font-mono`

**Carousel behavior:**
- Horizontal scroll with `overflow-x-auto` and `scroll-snap-type: x mandatory`
- Optional left/right arrow buttons for keyboard/mouse navigation
- Smooth scroll with CSS `scroll-behavior: smooth`
- On mobile: swipeable (native touch scroll)
- If no insights: hide the section entirely (don't show empty carousel)

```tsx
<div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide mb-6">
  {insights.map(insight => (
    <div key={insight.title} className="snap-start shrink-0 w-72 bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg">{iconMap[insight.icon]}</span>
        <div>
          <h3 className="font-medium text-white text-sm">{insight.title}</h3>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{insight.message}</p>
          {insight.metric && (
            <p className="font-mono text-lg text-white mt-2">
              {formatCurrency(insight.metric.value)}
            </p>
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

#### 3. Enhanced Stat Cards

Update the "This Month" stat card to include MoM and vs-average indicators:

**This Month card additions:**
- Below the main value, show two sub-indicators:
  - MoM change: arrow + percentage, colored green (down) or red (up)
  - vs Average: arrow + percentage, colored green (below) or red (above)

```tsx
<StatCard label="This Month" value={formatCurrency(summary.this_month)}>
  {summary.mom_change_pct !== null && (
    <div className={cn("flex items-center gap-1 text-xs mt-1",
      summary.mom_change_pct > 0 ? "text-red-400" : "text-green-400"
    )}>
      <span>{summary.mom_change_pct > 0 ? "↑" : "↓"}</span>
      <span>{Math.abs(summary.mom_change_pct).toFixed(1)}% MoM</span>
    </div>
  )}
  {summary.vs_avg_pct !== null && (
    <div className={cn("flex items-center gap-1 text-xs",
      summary.vs_avg_pct > 0 ? "text-red-400" : "text-green-400"
    )}>
      <span>{summary.vs_avg_pct > 0 ? "↑" : "↓"}</span>
      <span>{Math.abs(summary.vs_avg_pct).toFixed(1)}% vs avg</span>
    </div>
  )}
</StatCard>
```

**Note on color semantics:** For spending, green = spending less (good), red = spending more (warning). This is inverted from typical stock market coloring but more intuitive for a spending tracker.

The existing `StatCard` component may need to accept children or a `subContent` prop for the trend indicators. Update the component interface:

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  children?: React.ReactNode; // For trend indicators
}
```

#### 4. Spending Velocity Card (New)

New card section between stat cards row and the charts row.

Shows:
- **Daily rate:** `summary.daily_rate` formatted as "$X.XX/day" in `font-mono`
- **Projected total:** `forecast.projections.recommended` formatted as currency
- **Historical average:** `summary.avg_monthly` formatted as currency
- **Month progress bar:** visual showing days elapsed / days in month
- **Spending progress bar:** showing projected spending vs historical average

```tsx
<Card className="mb-6">
  <h3 className="text-sm text-gray-400 mb-4">Spending Velocity</h3>
  <div className="grid grid-cols-3 gap-4 mb-4">
    <div>
      <p className="text-xs text-gray-500">Daily Rate</p>
      <p className="font-mono text-lg text-white">
        {formatCurrency(summary.daily_rate)}/day
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500">Projected</p>
      <p className="font-mono text-lg text-white">
        {formatCurrency(forecast.projections.recommended)}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500">Average</p>
      <p className="font-mono text-lg text-white">
        {formatCurrency(summary.avg_monthly)}
      </p>
    </div>
  </div>

  {/* Month progress */}
  <div className="mb-3">
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>Month Progress</span>
      <span>{forecast.current_month.days_elapsed} / {forecast.current_month.days_in_month} days</span>
    </div>
    <div className="h-2 bg-border rounded-full overflow-hidden">
      <div className="h-full bg-white/30 rounded-full transition-all"
           style={{ width: `${(forecast.current_month.days_elapsed / forecast.current_month.days_in_month) * 100}%` }} />
    </div>
  </div>

  {/* Spending trajectory */}
  <div>
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>Projected vs Average</span>
      <span className={forecast.vs_average.projected_change_pct > 0 ? "text-red-400" : "text-green-400"}>
        {forecast.vs_average.projected_change_pct > 0 ? "+" : ""}
        {forecast.vs_average.projected_change_pct.toFixed(1)}%
      </span>
    </div>
    <div className="h-2 bg-border rounded-full overflow-hidden">
      <div className={cn(
        "h-full rounded-full transition-all",
        forecast.vs_average.projected_change_pct > 10 ? "bg-red-500" :
        forecast.vs_average.projected_change_pct > 0 ? "bg-yellow-500" : "bg-green-500"
      )}
      style={{ width: `${Math.min((forecast.projections.recommended / summary.avg_monthly) * 100, 100)}%` }} />
    </div>
  </div>
</Card>
```

**Color logic for trajectory bar:**
- Projected > avg + 10%: red (overspending)
- Projected within ±10% of avg: yellow (on track)
- Projected < avg: green (under budget)

#### 5. Enhanced Merchant List

Update the top merchants section to show the new data fields:

**Each merchant row now shows:**
- Rank number
- Merchant name (now normalized — "COSTCO" not "COSTCO WHOLESALE #0144")
- Total amount (`font-mono`, right-aligned)
- Transaction count
- Average per transaction: `~$X.XX/txn` in muted text
- Active months: `X months` in muted text

```tsx
<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
  <div className="flex items-center gap-3">
    <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
    <div>
      <p className="text-white">{merchant.merchant}</p>
      <p className="text-xs text-gray-500">
        {merchant.count} txns · ~{formatCurrency(merchant.avg_amount)}/txn · {merchant.active_months} months
      </p>
    </div>
  </div>
  <div className="text-right">
    <p className="font-mono text-white">{formatCurrency(merchant.total)}</p>
    <p className="text-xs text-gray-500">
      {merchant.monthly_frequency.toFixed(1)}x/month
    </p>
  </div>
</div>
```

#### 6. Monthly Trend Chart Enhancement

The monthly trend chart already exists. Add a visual enhancement:

- If `monthly` data includes `rolling_3mo_avg`, add a second dashed line for the rolling average
- Use Recharts `Line` component layered on top of the existing `Area`:
  ```tsx
  <Line
    type="monotone"
    dataKey="rolling_3mo_avg"
    stroke="#6B7280"
    strokeDasharray="5 5"
    dot={false}
    strokeWidth={1}
  />
  ```
- Add to tooltip to show both actual and rolling average
- Add to legend: "Actual" (solid) and "3-Month Avg" (dashed)

### Empty State

No change — existing empty state still works. If no data exists, the new sections simply don't render (insights array is empty, forecast has zero values, anomalies array is empty).

### Loading States

Add skeleton loaders for the new sections:
- Insights carousel: 3 skeleton cards (w-72, h-24 each) in a row
- Velocity card: single skeleton card
- Anomaly banner: hidden while loading

### Animations

- Insights cards: stagger fade-in with Framer Motion
- Anomaly banner: slide down from top on mount
- Velocity progress bars: animate width from 0 on mount
- MoM/vs-avg indicators: fade in after stat card values animate

### Responsive

- Insights carousel: horizontal scroll on all sizes, card width fixed at 272px
- Velocity card: 3-column grid on desktop, stacked on mobile (`grid-cols-1 md:grid-cols-3`)
- Anomaly banner: full width on all sizes

## Verification

1. Navigate to `/dashboard` with data imported
2. **Anomaly banner:** If any category has unusually high spending, a colored banner appears at top
3. **Insights carousel:** 3–5 insight cards visible, horizontally scrollable
4. **Stat cards:** "This Month" card shows MoM % change arrow (green ↓ or red ↑) and vs-average indicator
5. **Spending velocity:** Daily rate, projected total, and average displayed with progress bars
6. **Monthly trend:** Rolling 3-month average shown as dashed line alongside the actual area chart
7. **Merchants:** Names are normalized, each entry shows avg per transaction and frequency
8. **No regressions:** All existing dashboard functionality (hero stat, category donut, card comparison, period selector) still works
9. **Loading states:** Skeleton loaders appear for all sections while data loads
10. **Empty state:** Still works correctly when no data exists
11. **Responsive:** Insights carousel scrolls horizontally on mobile, velocity card stacks
