# Prompt 6: Dashboard / Overview Page

## Goal
Rich dashboard with animated hero stat, period selector, charts (spending trend, category breakdown, card comparison), and top merchants. This is the first page users see after importing data.

## Prerequisites
- Prompt 3 completed: `/api/stats/summary`, `/api/stats/monthly`, `/api/stats/merchants` endpoints work
- Prompt 4 completed: UI components, types, API client exist
- Prompt 5 completed: Data can be imported (needed to populate dashboard)

## Page: `frontend/src/app/dashboard/page.tsx`

`"use client"` page.

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Dashboard                                            │
│ Your spending at a glance                            │
│                            [This Month ▾] period sel │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌── Hero Stat ──────────────────────────────────┐  │
│  │                                                │  │
│  │         $12,345.67                             │  │
│  │         Total Spending                         │  │
│  │         456 transactions                       │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌── Stat Cards Row ─────────────────────────────┐  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │ │This Month│ │Last Month│ │Avg per Month  │   │  │
│  │ │$2,345.67 │ │$3,456.78 │ │$1,543.21     │   │  │
│  │ └──────────┘ └──────────┘ └──────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌── Monthly Trend ──────────┐ ┌── Categories ──┐  │
│  │                            │ │                 │  │
│  │  📈 Area/line chart       │ │  🍩 Donut chart│  │
│  │  Monthly totals over time │ │  By category    │  │
│  │                            │ │                 │  │
│  └────────────────────────────┘ └─────────────────┘  │
│                                                      │
│  ┌── Card Comparison ─────────────────────────────┐ │
│  │ ┌─ Amex Gold ─┐ ┌─ Citi ──────┐ ┌─ CapOne ─┐ │ │
│  │ │ $5,000      │ │ $4,200      │ │ $3,145   │ │ │
│  │ │ 200 txns    │ │ 156 txns    │ │ 100 txns │ │ │
│  │ │ ████████    │ │ ███████     │ │ ██████   │ │ │
│  │ │ (gold bar)  │ │ (blue bar)  │ │ (red bar)│ │ │
│  │ └─────────────┘ └─────────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌── Top Merchants ──────────────────────────────┐  │
│  │ 1. COSTCO WHOLESALE      $2,345.67  (15 txns)│  │
│  │ 2. WHOLE FOODS MKT       $1,234.56  (28 txns)│  │
│  │ 3. STARBUCKS              $567.89   (45 txns)│  │
│  │ 4. AMAZON.COM             $456.78   (12 txns)│  │
│  │ 5. ...                                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Detailed Implementation

#### Data Fetching

Fetch all data on mount (including cards for dynamic coloring):
```typescript
const [summary, setSummary] = useState<SummaryStats | null>(null);
const [monthly, setMonthly] = useState<MonthlyData | null>(null);
const [merchants, setMerchants] = useState<MerchantData[] | null>(null);
const [cards, setCards] = useState<Card[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([getSummary(), getMonthly(), getMerchants(), getCards()])
    .then(([s, m, mer, c]) => {
      setSummary(s.data);
      setMonthly(m.data);
      setMerchants(mer.data);
      setCards(c.data);
    })
    .finally(() => setLoading(false));
}, []);
```

Show skeleton loaders while loading.

#### Empty State

If no transactions exist (`summary.transaction_count === 0`), show:
- Empty state component with message: "No spending data yet"
- CTA button: "Import your first CSV" → links to `/import`

#### Period Selector

A dropdown or button group in the page header:
- Options: "This Month", "Last Month", "All Time"
- Default: "All Time"
- When selected, filters the displayed stats (client-side filter on the data, or re-fetch with date params)
- For simplicity, filter client-side: the summary endpoint returns `this_month` and `last_month` already. For "All Time", show `total_spent`.

#### Hero Stat — Animated Counter

- Large centered spending total in `font-mono`, prominent size (text-5xl or larger)
- Animate from 0 to the actual value on load using Framer Motion:
  ```tsx
  // Use framer-motion's useMotionValue + useTransform + animate
  // Or implement a simple counter with useEffect + requestAnimationFrame
  ```
- Duration: ~1.5 seconds, ease-out curve
- Format as currency with commas: `$12,345.67`
- Below: "Total Spending" label + transaction count

#### Stat Cards Row

Three `StatCard` components side by side:
1. **This Month** — `summary.this_month`
2. **Last Month** — `summary.last_month`
3. **Average per Month** — calculate: `total_spent / number_of_months` from monthly data

All values in `font-mono`, formatted as currency.

#### Monthly Spending Trend (Recharts)

- Chart type: `AreaChart` (filled area under the line)
- X axis: months (formatted "Jan '25", "Feb '25", etc.)
- Y axis: dollar amounts (formatted with $ prefix)
- Data from `monthly.monthly`
- Styling:
  - Area fill: gradient from translucent white to transparent
  - Line: white or subtle accent
  - Grid lines: `#1E1E26` (border color)
  - Background: transparent (sits on surface card)
  - Tooltip: dark themed, shows month + total formatted as currency
  - No default Recharts colors — override everything
- Responsive: use `ResponsiveContainer`

#### Category Breakdown (Recharts)

- Chart type: `PieChart` (donut style with `innerRadius`)
- Data from `summary.by_category`
- Each slice colored with `CATEGORY_COLORS` from constants
- Custom tooltip showing category name + amount + percentage
- Legend below or to the right (custom styled, not default Recharts legend)
- Center of donut: optionally show total or top category

#### Card Comparison

- **Dynamic** — shows one card per entry in `summary.by_card`, not hardcoded to 3
- Renders a responsive grid of cards (wraps if more than 3)
- Each shows:
  - Card label (looked up from cards list by code) with colored dot (color from `card.color`, applied via inline `style`)
  - Total spent (font-mono, large)
  - Transaction count
  - A horizontal progress bar showing proportion of total spending, filled with card color
- Only show cards that have data
- Colors come from the `cards` array fetched from the API — use `getCardColor(cards, code)` helper

#### Top Merchants

- Ranked list (top 10, from `/api/stats/merchants`)
- Each row:
  - Rank number
  - Merchant name (truncated if long)
  - Total amount (font-mono, right-aligned)
  - Transaction count (muted, parenthetical)
- Alternating row backgrounds for readability
- Maybe a small horizontal bar showing relative spend

### Recharts Dark Theme Configuration

Apply to ALL Recharts components:

```typescript
// Common Recharts props
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

### Animations

- Hero stat: count-up animation on load
- Stat cards: stagger fade-in with Framer Motion
- Charts: Recharts has built-in `isAnimationActive` — keep it enabled
- Card comparison bars: animate width from 0 on load

## Verification

1. Navigate to `/dashboard` with no data — empty state with import CTA shown
2. Import CSVs, return to dashboard — all sections populated
3. Hero stat animates from $0 to total
4. Monthly trend chart shows correct data points
5. Category donut shows all categories with correct colors
6. Card comparison shows all 3 cards with correct accent colors
7. Top merchants list matches backend data
8. Period selector toggles between this month / last month / all time
9. Loading states show skeletons before data arrives
10. All charts are dark-themed (no white backgrounds, correct grid/text colors)
