# Prompt 8: Analytics Page

## Goal
Deep spending analysis with multiple visualizations: monthly breakdown accordion, category trends, day-of-week/day-of-month patterns, and billing period view. This is the final page, completing the app.

## Prerequisites
- Prompt 3 completed: `/api/stats/monthly`, `/api/stats/patterns`, `/api/stats/merchants` endpoints work
- Prompt 4 completed: Types, API client, constants, Recharts theme exist
- Data has been imported via the import page

## Page: `frontend/src/app/analytics/page.tsx`

`"use client"` page.

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                                    │
│ Deep dive into your spending patterns                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌── Category Trends (Stacked Area Chart) ────────────────┐  │
│ │                                                         │  │
│ │  📊 Stacked area chart                                 │  │
│ │  Each category as a colored layer                      │  │
│ │  X: months, Y: dollar amounts                          │  │
│ │  Legend below with category colors                     │  │
│ │                                                         │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌── Day-of-Week Pattern ─────┐ ┌── Day-of-Month Pattern ─┐ │
│ │                             │ │                          │ │
│ │  📊 Bar chart              │ │  📊 Bar chart            │ │
│ │  Mon–Sun                   │ │  1st–31st                │ │
│ │  avg spending per day      │ │  total spending per day  │ │
│ │                             │ │                          │ │
│ └─────────────────────────────┘ └──────────────────────────┘ │
│                                                              │
│ ┌── Monthly Breakdown Accordion ──────────────────────────┐ │
│ │                                                          │ │
│ │ ▼ January 2025                     $3,456.78   89 txns  │ │
│ │   ┌── Categories ───────────────────────────────────┐   │ │
│ │   │ Dining      ████████████   $800.00  (23%)       │   │ │
│ │   │ Groceries   ██████████     $650.00  (19%)       │   │ │
│ │   │ Gas         █████          $320.00  (9%)        │   │ │
│ │   │ ...                                              │   │ │
│ │   └─────────────────────────────────────────────────┘   │ │
│ │   ┌── By Card ──────────────────────────────────────┐   │ │
│ │   │ Amex Gold     ███████████  $1,500.00            │   │ │
│ │   │ Citi Costco   █████████    $1,200.00            │   │ │
│ │   │ Capital One   ███████      $756.78              │   │ │
│ │   └─────────────────────────────────────────────────┘   │ │
│ │                                                          │ │
│ │ ▶ February 2025                    $2,987.65   76 txns  │ │
│ │ ▶ March 2025                       $3,123.45   82 txns  │ │
│ │ ...                                                      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌── Billing Period View ──────────────────────────────────┐ │
│ │                                                          │ │
│ │ Approximate billing cycles (grouped by ~30-day periods) │ │
│ │                                                          │ │
│ │ Cycle 1: Jan 15 – Feb 14    $2,345.67                  │ │
│ │ Cycle 2: Feb 15 – Mar 14    $2,567.89                  │ │
│ │ ...                                                      │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Implementation

#### Data Fetching

Fetch all analytics data on mount (including cards for dynamic colors):

```typescript
const [monthly, setMonthly] = useState<MonthlyData | null>(null);
const [patterns, setPatterns] = useState<PatternData | null>(null);
const [cards, setCards] = useState<Card[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([getMonthly(), getPatterns(), getCards()])
    .then(([m, p, c]) => {
      setMonthly(m.data);
      setPatterns(p.data);
      setCards(c.data);
    })
    .finally(() => setLoading(false));
}, []);
```

Show skeleton loaders while loading. Show empty state if no data.

#### 1. Category Trends — Stacked Area Chart

**Data source:** `monthly.monthly_by_category`

**Data transformation:** Pivot the flat array into a format Recharts can use:
```typescript
// Input: [{ month: "2025-01", category: "Dining", total: 800 }, ...]
// Output: [{ month: "Jan '25", Dining: 800, Groceries: 650, Gas: 320, ... }, ...]
```

Group by month, then for each month create an object with each category as a key.

**Chart configuration:**
- `AreaChart` with `stackOffset="none"` (standard stacking)
- One `Area` component per category, each with its color from `CATEGORY_COLORS`
- `fillOpacity={0.6}` so overlapping areas are visible
- Smooth curve: `type="monotone"`
- X axis: months formatted as "Jan '25"
- Y axis: dollar amounts
- Tooltip: show all categories for the hovered month with amounts
- Legend: show category names with colored dots below the chart
- Dark themed: grid lines, axis colors, tooltip styling per Recharts theme

#### 2. Day-of-Week Pattern — Bar Chart

**Data source:** `patterns.day_of_week`

**Chart configuration:**
- `BarChart` with 7 bars (Sun–Sat)
- X axis: day names ("Mon", "Tue", etc.)
- Y axis: total spending
- Bar color: gradient or single accent color (e.g., a cool blue-green)
- Tooltip: show day name + total + transaction count
- Highlight the highest-spending day with a brighter bar or label

#### 3. Day-of-Month Pattern — Bar Chart

**Data source:** `patterns.day_of_month`

**Chart configuration:**
- `BarChart` with up to 31 bars (1st–31st)
- X axis: day numbers. With 31 bars, labels may be cramped — show every 5th label or rotate
- Y axis: total spending
- Same styling as day-of-week chart
- Tooltip: show day number + total + count

#### 4. Monthly Breakdown Accordion

**Data source:** `monthly.monthly` (totals) + `monthly.monthly_by_category` + `monthly.monthly_by_card`

**Implementation:**
- One accordion item per month, in reverse chronological order (most recent first)
- **Header (always visible):** Month name ("January 2025"), total amount, transaction count, chevron icon
- **Expanded content:**
  - **Categories section:** Horizontal bar chart or simple bar list showing each category
    - Category name, colored bar (proportional width), amount, percentage of month total
    - Sorted by amount descending
    - Bar colors from `CATEGORY_COLORS`
  - **By Card section:** Similar bar list, one per card (dynamic — renders all cards that have data, not hardcoded to 3)
    - Card label with accent color dot (color from `cards` array via `getCardColor()`), bar with card color, amount
- **Animation:** Smooth expand/collapse with Framer Motion (height + opacity)
- **Default state:** First (most recent) month expanded, rest collapsed
- Allow multiple months open simultaneously

**Building the data structure:**

```typescript
interface MonthBreakdown {
  month: string;        // "2025-01"
  label: string;        // "January 2025"
  total: number;
  count: number;
  categories: Array<{ category: string; total: number; percent: number }>;
  cards: Array<{ card: string; total: number }>;
}
```

Process `monthly_by_category` and `monthly_by_card` arrays to group by month.

#### 5. Billing Period View

**Data source:** Derived from transactions (can fetch from `/api/transactions?sort_by=date&sort_order=asc&per_page=200` or from monthly data)

**Concept:** Group spending into approximate 30-day billing cycles starting from the earliest transaction date. This is an approximation — real billing cycles vary by card.

**Implementation approach:**
- Take the earliest transaction date and latest transaction date
- Divide into ~30-day windows
- For each window: show date range, total spent, transaction count
- Display as a simple table or card list
- Highlight the current/most recent billing period

**Simpler alternative:** Since we have monthly data already, just reformat the monthly totals as "billing periods" with approximate date ranges (month start to month end). This avoids needing to fetch all transactions.

```typescript
// For each month in monthly.monthly:
// "Jan 1 – Jan 31, 2025" → $3,456.78
// Show as a clean list with progress bars relative to highest month
```

### Empty State

If no data:
- "No spending data to analyze"
- CTA: "Import CSV files" → `/import`

### Loading States

- Skeleton loaders for each chart section
- Charts show smoothly after data loads (Recharts animation)

### Recharts Dark Theme (Consistent with Dashboard)

Apply the same theme constants as prompt 06:

```typescript
const CHART_THEME = {
  grid: { stroke: "#1E1E26" },
  axis: { stroke: "#6B7280", fontSize: 12 },
  tooltip: {
    contentStyle: { backgroundColor: "#141419", border: "1px solid #1E1E26", borderRadius: 8 },
    labelStyle: { color: "#9CA3AF" },
    itemStyle: { color: "#FFFFFF" },
  },
};
```

Consider extracting this to a shared constant in `lib/constants.ts` if not already done in prompt 06.

### Responsive Considerations

- Charts use `ResponsiveContainer` from Recharts
- Day-of-week and day-of-month charts sit side by side on desktop, stack on mobile
- Category trends chart is full width
- Accordion is full width
- Consider `grid grid-cols-1 md:grid-cols-2` for the two pattern charts

## Verification

1. Navigate to `/analytics` with no data — empty state shown
2. Import CSVs, return to analytics — all sections populated
3. **Category trends:** Stacked areas visible, hovering shows tooltip with breakdown, legend shows all categories
4. **Day-of-week:** 7 bars showing spending by day, tooltip works
5. **Day-of-month:** Up to 31 bars, labels readable, tooltip works
6. **Monthly accordion:** All months listed, click to expand/collapse, category and card breakdowns correct
7. **Billing periods:** Date ranges and totals shown
8. All charts are dark-themed consistently
9. Loading skeletons show while data fetches
10. No console errors or TypeScript warnings

## Final End-to-End Verification (All 8 Prompts Complete)

After this prompt, the entire app should be functional:

1. `docker-compose up` — backend + DB start successfully
2. `cd frontend && npm run dev` — frontend compiles and loads
3. Navigate to `/import` — upload CSVs for all 3 cards
4. Navigate to `/dashboard` — hero stat, charts, card comparison, merchants all populated
5. Navigate to `/transactions` — full table with search, filter, sort, bulk edit, expandable rows
6. Navigate to `/analytics` — category trends, day patterns, monthly accordion, billing periods
7. Sidebar navigation works for all pages, active state correct
8. Dark theme consistent throughout, no white flashes
9. JetBrains Mono used for financial data, Inter for UI text
10. Card accent colors (gold, blue, red) consistent everywhere
