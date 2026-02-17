# Prompt 4: Frontend Foundation — Types, API Client, Layout, Shared UI, and 5 Dashboard Design Trials

## Goal
Full app shell with collapsible sidebar, typed API client, reusable UI components, all page routes stubbed, and **5 distinct dashboard design iterations** at routes `/1` through `/5` for comparison. After this prompt, the frontend skeleton is complete, navigable, and showcases five competing dashboard philosophies.

## Prerequisites
- Prompt 1 completed: Next.js app with Tailwind dark theme configured
- Prompt 3 completed: Backend API fully functional (needed to know response shapes)

## File Structure After This Prompt

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout with fonts, metadata, sidebar
│   ├── globals.css             # Tailwind + custom styles
│   ├── page.tsx                # Redirects to /1
│   ├── 1/page.tsx              # Design Trial 1: Command Center
│   ├── 2/page.tsx              # Design Trial 2: Zen Minimalist
│   ├── 3/page.tsx              # Design Trial 3: Story Mode
│   ├── 4/page.tsx              # Design Trial 4: Action Dashboard
│   ├── 5/page.tsx              # Design Trial 5: Visual First
│   ├── import/page.tsx         # Stub
│   ├── transactions/page.tsx   # Stub
│   ├── analytics/page.tsx      # Stub
│   └── settings/page.tsx       # Card management + user config
├── components/
│   ├── sidebar.tsx             # Collapsible nav sidebar
│   ├── page-header.tsx         # Reusable page title + description
│   ├── dashboards/
│   │   ├── design-trial-navigator.tsx  # Floating bar to switch between designs
│   │   ├── command-center.tsx          # Design 1 layout
│   │   ├── zen-minimalist.tsx          # Design 2 layout
│   │   ├── story-mode.tsx              # Design 3 layout
│   │   ├── action-dashboard.tsx        # Design 4 layout
│   │   └── visual-first.tsx            # Design 5 layout
│   ├── ui/
│   │   ├── card.tsx            # Surface card container
│   │   ├── button.tsx          # Button with variants
│   │   ├── badge.tsx           # Colored badge/pill
│   │   ├── stat-card.tsx       # Stat display with label + value
│   │   ├── skeleton.tsx        # Loading skeleton
│   │   └── empty-state.tsx     # Empty state with icon + message + CTA
│   └── coverage-tracker.tsx    # Visual timeline of data coverage
├── hooks/
│   ├── use-api.ts              # Generic fetch hook
│   └── use-dashboard-data.ts   # Shared data hook for all 5 designs
├── lib/
│   ├── api.ts                  # Typed API client
│   ├── constants.ts            # Card helpers, colors, categories
│   └── utils.ts                # cn(), formatCurrency(), formatDate(), truncateText()
└── types/
    └── index.ts                # All TypeScript interfaces
```

---

## Detailed Tasks

### 1. TypeScript Types (`frontend/src/types/index.ts`)

```typescript
// ── Card Config (from DB, user can add custom cards) ──

export interface Card {
  id: string;
  code: string;            // "amex", "citi", "capitalone", or user-defined
  label: string;           // "Amex Gold", "Discover It", etc.
  color: string;           // Hex color, e.g. "#C5A44E"
  header_pattern: string | null;    // Comma-separated keywords for auto-detection
  date_column: string | null;
  date_format: string | null;
  description_column: string | null;
  amount_column: string | null;
  debit_column: string | null;
  credit_column: string | null;
  category_column: string | null;
  member_column: string | null;
  skip_negative_amounts: boolean;
  created_at: string;
}

export interface NewCard {
  code: string;
  label: string;
  color: string;
  header_pattern?: string;
  date_column?: string;
  date_format?: string;
  description_column?: string;
  amount_column?: string;
  debit_column?: string;
  credit_column?: string;
  category_column?: string;
  member_column?: string;
  skip_negative_amounts?: boolean;
}

// ── User Config ──

export interface UserConfig {
  user_name?: string;
  [key: string]: string | undefined;
}

// ── Transactions ──

export interface Transaction {
  id: string;
  date: string;           // "YYYY-MM-DD"
  description: string;
  amount: number;
  category: string;
  card: string;           // card code (dynamic, not just 3 options)
  card_label: string;     // denormalized label at time of import
  raw_data: Record<string, string> | null;
  hash: string;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface ImportResult {
  card: string;
  card_label: string;
  file_name: string;
  new_count: number;
  duplicate_count: number;
  skipped_user_count: number;
  total_parsed: number;
}

export interface ImportRecord {
  id: string;
  imported_at: string;
  card: string;
  file_name: string;
  transaction_count: number;
  duplicate_count: number;
  skipped_user_count: number;
}

export interface SummaryStats {
  total_spent: number;
  transaction_count: number;
  this_month: number;
  last_month: number;
  by_card: Array<{ card: string; total: number; count: number }>;
  by_category: Array<{ category: string; total: number; count: number }>;
}

export interface MonthlyData {
  monthly: Array<{ month: string; total: number; count: number }>;
  monthly_by_card: Array<{ month: string; card: string; total: number }>;
  monthly_by_category: Array<{ month: string; category: string; total: number }>;
}

export interface MerchantData {
  merchant: string;
  total: number;
  count: number;
}

export interface PatternData {
  day_of_week: Array<{ day: string; day_num: number; total: number; count: number }>;
  day_of_month: Array<{ day: number; total: number; count: number }>;
}

// ── Enhanced Types (for dashboard designs) ──

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

export interface HabitAnalysis {
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

export interface DailySpending {
  date: string;
  total: number;
  count: number;
}
```

### 2. Constants (`frontend/src/lib/constants.ts`)

```typescript
// Cards are now dynamic — fetched from the API via getCards().
// No hardcoded CARDS object. Components that need card info should fetch
// from the API and cache/pass as props or context.

// Helper to get a card's color by code from a fetched cards array:
export function getCardColor(cards: Card[], code: string): string {
  return cards.find(c => c.code === code)?.color ?? "#6B7280";
}

export function getCardLabel(cards: Card[], code: string): string {
  return cards.find(c => c.code === code)?.label ?? code;
}

export const CATEGORIES = [
  "Dining", "Groceries", "Gas", "Shopping", "Subscriptions",
  "Transportation", "Travel", "Health", "Uncategorized"
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Dining: "#F59E0B",
  Groceries: "#10B981",
  Gas: "#EF4444",
  Shopping: "#8B5CF6",
  Subscriptions: "#EC4899",
  Transportation: "#06B6D4",
  Travel: "#3B82F6",
  Health: "#14B8A6",
  Uncategorized: "#6B7280",
};

export const API_BASE = "http://localhost:8080/api";
```

### 3. Utilities (`frontend/src/lib/utils.ts`)

```typescript
// cn() — Tailwind class merger (install clsx + tailwind-merge, or just use a simple join)
// formatCurrency(amount: number) — "$1,234.56" format
// formatDate(dateStr: string) — "Jan 15, 2025" format using date-fns
// truncateText(text: string, maxLength: number) — truncate with "..."
```

Install `clsx` and `tailwind-merge` for the `cn()` utility:
```bash
npm install clsx tailwind-merge
```

### 4. API Client (`frontend/src/lib/api.ts`)

Typed fetch wrapper:

```typescript
// Generic fetcher with error handling
async function fetcher<T>(url: string, options?: RequestInit): Promise<T>

// ── Cards ──
export async function getCards(): Promise<{ data: Card[] }>
export async function createCard(card: NewCard): Promise<{ data: Card }>
export async function updateCard(id: string, updates: Partial<NewCard>): Promise<{ data: Card }>
export async function deleteCard(id: string): Promise<void>

// ── User Config ──
export async function getConfig(): Promise<{ data: UserConfig }>
export async function updateConfig(config: UserConfig): Promise<void>

// ── Transactions ──
export async function getTransactions(params?: Record<string, string>): Promise<TransactionsResponse>
export async function deleteAllTransactions(): Promise<void>
export async function updateCategory(id: string, category: string): Promise<void>
export async function bulkUpdateCategory(ids: string[], category: string): Promise<void>

// ── Import ──
export async function importCSV(file: File, cardCode?: string): Promise<{ data: ImportResult }>
export async function getImportHistory(): Promise<{ data: ImportRecord[] }>

// ── Stats ──
export async function getSummary(): Promise<{ data: SummaryStats }>
export async function getMonthly(): Promise<{ data: MonthlyData }>
export async function getMerchants(): Promise<{ data: MerchantData[] }>
export async function getPatterns(): Promise<{ data: PatternData }>

// ── Enhanced Stats (for dashboard designs) ──
export async function getForecast(): Promise<{ data: ForecastData }>
export async function getInsights(): Promise<{ data: Insight[] }>
export async function getAnomalies(): Promise<{
  data: {
    category_anomalies: CategoryAnomaly[];
    transaction_anomalies: any[];
  }
}>
export async function getRecurring(): Promise<{
  data: {
    recurring: RecurringTransaction[];
    total_monthly_recurring: number;
    total_annual_recurring: number;
  }
}>
export async function getHabits(): Promise<{ data: HabitAnalysis }>
export async function getDaily(start?: string, end?: string): Promise<{ data: DailySpending[] }>
```

For `importCSV`, use `FormData` with the file attached, send to `/api/transactions/import`. If `cardCode` is provided, also append it as a form field (`card_code`).

For `getTransactions`, convert the params object to URL search params.

For `getDaily`, pass `start_date` and `end_date` as query params if provided.

### 5. Collapsible Sidebar (`frontend/src/components/sidebar.tsx`)

`"use client"` component.

- Fixed left sidebar, dark surface background (`bg-surface`)
- Logo/title at top: "Ledgr" in `font-mono`
- Nav items with icons (use simple SVG icons or Unicode symbols — no icon library needed):
  - Dashboard (grid/chart icon) — links to `/1` (current active trial)
  - Import (upload icon)
  - Transactions (list icon)
  - Analytics (bar-chart icon)
  - Settings (gear icon) — card management + user config
  - **Divider line**
  - Design Trials section — links to `/1`, `/2`, `/3`, `/4`, `/5` with labels
- Active route highlighted with subtle background + left accent border
- Use `usePathname()` from `next/navigation` to detect active route
- Collapse toggle button that shrinks sidebar to icon-only mode
- Animate collapse/expand with Framer Motion (`animate={{ width }}`)
- Bottom section: small "Local only" badge or similar indicator
- Subtle border-right using the `border` color

### 6. Page Header (`frontend/src/components/page-header.tsx`)

Simple component:
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode; // Optional right-side action button
}
```

Large title, smaller description below, optional action aligned right.

### 7. UI Components (`frontend/src/components/ui/`)

**`card.tsx`** — Surface container with border:
```tsx
// Wrapper div with bg-surface, border border-border, rounded-lg, p-6
// Optional: hover effect, different padding sizes
```

**`button.tsx`** — Button with variants:
```tsx
// Variants: primary (white bg), secondary (surface bg), danger (red)
// Sizes: sm, md, lg
// States: disabled, loading
```

**`badge.tsx`** — Colored pill:
```tsx
// Accepts: children, color (hex or Tailwind class), variant (filled/outlined)
// Used for card labels and categories
```

**`stat-card.tsx`** — Stat display:
```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}
// Label on top (small, muted), value large in font-mono, optional sub-value below
```

**`skeleton.tsx`** — Loading placeholder:
```tsx
// Animated shimmer div, accepts className for sizing
// Variants: text, card, chart (different aspect ratios)
```

**`empty-state.tsx`** — Empty/no-data display:
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}
// Centered layout with icon, title, description, optional CTA link
```

### 8. Coverage Tracker (`frontend/src/components/coverage-tracker.tsx`)

Visual timeline showing which months have data for each card.

- Shows a grid: rows = all configured cards (fetched from API, dynamic — not hardcoded to 3), columns = months (from Jan 2025 to current month)
- Each cell: filled with card color if data exists for that month, empty/gray if not
- Data source: derived from transactions (call `/api/stats/monthly` or pass data as prop), plus cards list from API
- Use each card's `color` field for filled cells (applied via `style={{ backgroundColor: card.color }}`)
- Shows month labels along the top (abbreviated: "Jan", "Feb", etc.)
- Small component, meant to appear on the dashboard or import page

### 9. Root Layout Update (`frontend/src/app/layout.tsx`)

Update the root layout to include the sidebar:
- Import the Sidebar component
- Layout: sidebar on the left, main content area on the right
- Main content area has padding and scrolls independently
- The content area should take remaining width

```tsx
<body>
  <div className="flex h-screen">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-8">
      {children}
    </main>
  </div>
</body>
```

### 10. Shared Dashboard Data Hook (`frontend/src/hooks/use-dashboard-data.ts`)

`"use client"` hook. All 5 dashboard designs use this single hook to fetch their data.

```typescript
export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    summary: EnhancedSummaryStats | null;
    monthly: MonthlyData | null;
    merchants: EnhancedMerchant[] | null;
    cards: Card[];
    forecast: ForecastData | null;
    insights: Insight[] | null;
    anomalies: CategoryAnomaly[];
    recurring: RecurringTransaction[] | null;
    habits: HabitAnalysis | null;
    daily: DailySpending[] | null;
  }>({
    summary: null,
    monthly: null,
    merchants: null,
    cards: [],
    forecast: null,
    insights: null,
    anomalies: [],
    recurring: null,
    habits: null,
    daily: null,
  });

  useEffect(() => {
    Promise.all([
      getSummary(),
      getMonthly(),
      getMerchants(),
      getCards(),
      getForecast(),
      getInsights(),
      getAnomalies(),
      getRecurring(),
      getHabits(),
      getDaily(),
    ])
      .then(([summary, monthly, merchants, cards, forecast, insights, anomalies, recurring, habits, daily]) => {
        setData({
          summary: summary.data as EnhancedSummaryStats,
          monthly: monthly.data,
          merchants: merchants.data as EnhancedMerchant[],
          cards: cards.data,
          forecast: forecast.data,
          insights: insights.data,
          anomalies: anomalies.data.category_anomalies || [],
          recurring: recurring.data.recurring,
          habits: habits.data,
          daily: daily.data,
        });
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err);
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading, error };
}
```

Each design destructures what it needs: `const { summary, forecast, insights, loading, error } = useDashboardData();`

### 11. Design Trial Navigator (`frontend/src/components/dashboards/design-trial-navigator.tsx`)

Floating navigation bar fixed to the top center of the viewport for switching between designs.

```tsx
interface DesignTrialNavigatorProps {
  currentTrial: 1 | 2 | 3 | 4 | 5;
}

const TRIALS = [
  { id: 1, name: 'Command Center', desc: 'Dense data grid' },
  { id: 2, name: 'Zen Minimalist', desc: 'Focus & calm' },
  { id: 3, name: 'Story Mode', desc: 'Narrative finance' },
  { id: 4, name: 'Action Dashboard', desc: 'Task-oriented' },
  { id: 5, name: 'Visual First', desc: 'Chart gallery' },
] as const;
```

- `bg-surface/95 backdrop-blur` with `border border-border rounded-full`
- Fixed position `top-4 left-1/2 -translate-x-1/2 z-50`
- Each trial is a `Link` — active trial gets `bg-white text-black font-medium`, inactive gets `text-gray-400 hover:text-white hover:bg-white/10`
- Label format: `"1. Command Center"`, with `title={trial.desc}` tooltip
- Small `"Design Trial:"` prefix text in muted gray

### 12. Page Stubs

**`page.tsx`** (root) — redirect to `/1`:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/1"); }
```

**`import/page.tsx`:**
```tsx
// "use client"
// PageHeader: "Import", "Upload CSV files from your credit cards"
// EmptyState or placeholder
```

**`transactions/page.tsx`:**
```tsx
// "use client"
// PageHeader: "Transactions", "All your spending in one place"
// EmptyState or placeholder
```

**`analytics/page.tsx`:**
```tsx
// "use client"
// PageHeader: "Analytics", "Deep dive into your spending patterns"
// EmptyState or placeholder
```

**`settings/page.tsx`:**
```tsx
// "use client"
// PageHeader: "Settings", "Manage cards and preferences"
// Two sections:
//   1. User Config — text input for user_name, save button, explanation of what it does
//      (filters out authorized-user transactions that aren't yours)
//   2. Cards — list of configured cards with edit/delete, add new card button
// EmptyState or placeholder for now (full implementation is simple CRUD forms)
```

---

## Design Trial Specifications

All 5 designs are `"use client"` pages that:
1. Import and render `<DesignTrialNavigator currentTrial={N} />`
2. Call `useDashboardData()` for all data
3. Show a `<Skeleton />` loading state while data loads
4. Show an `<EmptyState />` if no transaction data exists
5. Render their unique layout when data is available

Each design lives in its own route page (`/1/page.tsx` through `/5/page.tsx`) and imports shared components from `components/dashboards/` plus any design-specific inline components.

---

### Design 1: Command Center (`/1/page.tsx`)

**Philosophy:** Maximum information density for power users who want every metric visible simultaneously. No scrolling required for core insights. Bloomberg Terminal meets dark-theme finance dashboard — numbers everywhere, multiple visualizations side-by-side, quick scan of everything.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                    Feb 2026  $2,345.67│
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ Total    │ This Mo  │ Avg Mo   │ Proj Mo  │ [3 severity badges] │
│ $45.2k   │ $2.3k    │ $2.1k    │ $2.6k    │ 2 High  1 Med       │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│ ┌────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ Monthly Trend (6mo)    │ │ Category Breakdown (This Month)  │ │
│ │ [sparkline chart]      │ │ [compact bar chart]              │ │
│ └────────────────────────┘ └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────────────────┐ │
│ │ By Card     │ │ Top Merch   │ │ Daily Rate (7-day heatmap) │ │
│ │ Amex $1.2k  │ │ COSTCO $340 │ │ [compact calendar heat]    │ │
│ │ Citi $800   │ │ AMAZON $280 │ │                            │ │
│ │ Cap1 $300   │ │ WHOLE  $210 │ │                            │ │
│ └─────────────┘ └─────────────┘ └────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────────────┐│
│ │ Recurring $450/mo   │ │ Insights (Top 3)                    ││
│ │ 8 subscriptions     │ │ * Dining 2.3σ above avg this month  ││
│ │ [mini bar list]     │ │ * Weekend spending +85% vs weekday  ││
│ │                     │ │ * Projected to exceed avg by 18%    ││
│ └─────────────────────┘ └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Grid layout with 6-8 visible cards, all above the fold on a standard display
- Micro-visualizations: sparklines (Recharts `<LineChart>` tiny), mini horizontal bars, compact 7-day heatmap
- Heavy use of `font-mono` for all numbers
- Color coding for severity: red = high anomaly, yellow = medium, green = good
- Sigma (σ) symbols for statistical significance on anomaly badges
- Card colors used as left accent borders on the by-card section

**Data Used:**
- `summary`: total, this_month, avg_monthly, projected_month_total
- `insights`: top 3 by severity
- `anomalies`: severity badge counts
- `monthly`: 6-month sparkline trend
- `summary.by_category`: compact bar chart
- `summary.by_card`: card spending list
- `merchants`: top 3
- `daily`: 7-day heatmap
- `recurring`: subscription count + monthly total

**Animations:**
- Stagger fade-in for each card (50ms delay between each) using Framer Motion `staggerChildren`
- Numbers count up on mount (odometer effect — animate from 0 to value over 600ms)
- Sparkline and bar charts animate with Recharts `isAnimationActive` draw effect
- Hover on stat cards shows comparison tooltip ("18% above avg")

---

### Design 2: Zen Minimalist (`/2/page.tsx`)

**Philosophy:** Embrace dark space. Show only the essential insight at the top, with progressive disclosure for details. Reduce anxiety by presenting a calm, focused view. One big number, one big chart, one big insight. Everything else is a scroll away.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        This Month                               │
│                                                                 │
│                        $2,345.67                                │
│                                                                 │
│                   18% above your average                        │
│                   projected to finish at $2,650                 │
│                                                                 │
│     ┌───────────────────────────────────────────────────┐       │
│     │                                                   │       │
│     │        [Large area chart — 12 month trend]        │       │
│     │                                                   │       │
│     └───────────────────────────────────────────────────┘       │
│                                                                 │
│                    ─── scroll for details ───                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[Scroll down reveals]

┌─────────────────────────────────────────────────────────────────┐
│                     What's driving this?                        │
│                                                                 │
│                      Dining: $680 (+45%)                        │
│                   Groceries: $520 (+12%)                        │
│                   Shopping: $420 (-8%)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Your recurring expenses                       │
│                                                                 │
│                         $450 / month                            │
│                      8 active subscriptions                     │
│                                                                 │
│                   [View all subscriptions →]                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Massive hero number at the top: this month's spending in very large `font-mono` (text-6xl or larger)
- Single, beautiful large Recharts `<AreaChart>` — 12-month trend with gradient fill
- Generous spacing: 2-3x normal padding (`py-16`, `py-12` between sections)
- Maximum 3 items per section to avoid overload
- Muted, desaturated colors (lower opacity card colors)
- Conversational, human language ("18% above your average" not "MoM: +18%")
- Progressive disclosure: scroll reveals more detail sections

**Data Used:**
- `summary`: this_month (hero number)
- `forecast`: vs_average, projected (comparison text)
- `monthly`: 12-month trend (primary area chart)
- `anomalies` + `summary.by_category`: top 3 category changes (scroll section 1)
- `recurring`: subscription summary (scroll section 2)
- `insights`: top insight (scroll section 3)

**Animations:**
- Chart draws slowly (1.5s Recharts animation duration)
- Gentle fade in as sections enter viewport (Framer Motion `whileInView`)
- "Breathing" animation on the big number: subtle scale pulse (1.0 → 1.02 → 1.0, 3s loop)
- Hover states are subtle — no dramatic color changes, just slight opacity shifts
- Smooth parallax-like effect on hero section (optional, via scroll listener)

---

### Design 3: Story Mode (`/3/page.tsx`)

**Philosophy:** Turn spending data into a story. Guide the user through their month like a narrative report. Each section builds on the previous, creating a coherent narrative about their financial behavior. Emphasize insights and context over raw numbers.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Your February Story                                             │
│                                                                 │
│ "You're on track for a strong month."                           │
│                                                                 │
│ So far this month, you've spent $2,345 across 67 transactions. │
│ That's 6% below your typical pace — nice work! At this rate,    │
│ you'll finish around $2,480, well under your 3-month average.   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                [Trajectory visualization]                    │ │
│ │          Projected ──┐  You're here                         │ │
│ │            $2,480    │      *                                │ │
│ │ ─────────────────────┼────────────────────────→ Time         │ │
│ │           Average    │                                       │ │
│ │            $2,650    └──                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ However, Dining has spiked — you've spent $680 at restaurants   │
│ this month, 45% above normal. Here are your top spots:          │
│                                                                 │
│    * CHICK-FIL-A — 8 visits, $78 total                          │
│    * CHIPOTLE — 5 visits, $63 total                             │
│    * STARBUCKS — 12 visits, $54 total                           │
│                                                                 │
│ Your weekend spending is running 85% higher than weekdays.      │
│ Consider setting a weekend budget to keep this in check.        │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ The Good News                                                   │
│                                                                 │
│ Shopping is down 12% from last month — you saved $80 there.     │
│ Your recurring subscriptions ($450/mo) are stable with no       │
│ new charges detected.                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Prose-first layout: paragraphs of text, not stat cards — this is a narrative report
- Conversational tone with value judgments ("nice work!", "consider...")
- Timeline/narrative structure: opening summary → conflict (anomalies) → resolution (good news)
- Trajectory visualization: a Recharts `<LineChart>` showing projected path vs average path with "you are here" dot
- Merchants shown with visit count, not just totals (derived from `count` field)
- Clear "good news / bad news" sections with divider
- Max-width prose container (`max-w-2xl mx-auto`) for comfortable reading

**Data Used:**
- `summary`: this_month, transaction_count (opening paragraph)
- `forecast`: trajectory, projections.recommended, vs_average (narrative framing)
- `anomalies`: highest severity anomaly becomes the "conflict" paragraph
- `merchants`: top 3 within the anomaly category (merchant detail)
- `habits.weekend_splurge`: weekend vs weekday insight
- `habits.category_creep`: categories trending down (good news section)
- `recurring`: stability check (good news section)

**Narrative Generation Logic:**
- Opening headline is conditional on `forecast.trajectory`:
  - `below_average` → "You're on track for a strong month."
  - `near_average` → "A steady month so far."
  - `above_average` → "Spending is running a bit hot this month."
  - `well_above_average` → "This month needs some attention."
- Build paragraphs dynamically from data — the prose templates are in the component, filled with real numbers
- Use `font-sans` for body text, `font-mono` only for inline dollar amounts

**Animations:**
- Sections fade in sequentially as user scrolls (Framer Motion `whileInView` with `once: true`)
- Trajectory line draws as it enters viewport (Recharts animation triggered on scroll)
- Merchant list items slide in from left with stagger (100ms per item)
- Inline dollar amounts get a subtle background pulse highlight on first appearance

---

### Design 4: Action Dashboard (`/4/page.tsx`)

**Philosophy:** Every insight is actionable. Present spending data as a task list with recommended actions. Focus on what the user should DO, not just what happened. Gamified elements with checkable items, achievement badges, and clear next steps.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Action Items                                        3 of 5 done │
│                                                                 │
│ [x] Monthly review complete                     [View report]   │
│ [x] Recurring charges verified                  [8 items]       │
│ [ ] Address Dining overspend                    +$230 over avg  │
│ [ ] Review weekend spending pattern             85% higher      │
│ [ ] Cancel unused subscription?                 Netflix idle    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ This Month's Mission                          18 days remaining │
│                                                                 │
│ Stay under $2,650 (your 3-month average)                        │
│                                                                 │
│ ████████████████░░░░░░░░░░ $2,345 / $2,650                      │
│                                                                 │
│ Current pace: $2,480 projected — On track                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Quick Wins                                                      │
│                                                                 │
│ ┌──────────────────────────────────┐                            │
│ │ Reduce Dining by 20%             │ Potential save: $136       │
│ │    Current: $680  →  Goal: $544  │                            │
│ │    [Track this goal]             │                            │
│ └──────────────────────────────────┘                            │
│                                                                 │
│ ┌──────────────────────────────────┐                            │
│ │ Weekend budget: $150             │ vs current: $280           │
│ │    You typically spend $40/day   │                            │
│ │    [Set weekend alert]           │                            │
│ └──────────────────────────────────┘                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Recent Achievements                                             │
│                                                                 │
│ * Shopping down 12% from last month                             │
│ * 5-day streak: no impulse purchases under $15                  │
│ * Recurring expenses stable for 3 months                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Checkbox list at top: interactive to-do items (local state, check/uncheck toggles)
- Action items are auto-generated from data:
  - `anomalies` with severity "high" or "critical" → action to "Address [category] overspend"
  - `habits.weekend_splurge.ratio > 1.5` → action to "Review weekend spending"
  - `recurring` items with `potentially_forgotten: true` → action to "Cancel unused subscription?"
  - Always include "Monthly review complete" and "Recurring charges verified" as checkable items
- Progress bar for monthly target: `summary.this_month / forecast.vs_average.avg_monthly` as percentage
- "Mission" framing with days remaining in month
- Quick Wins: top 2 anomaly categories with calculated savings if reduced by 20%
- Achievement badges: positive trends from `habits.category_creep` (decreasing categories), impulse spending improvements, recurring stability
- Completion counter: "3 of 5 done" updates as user checks items

**Data Used:**
- `anomalies`: generates action items for overspend categories
- `habits`: weekend_splurge (action item), impulse_spending (achievement), category_creep (achievements)
- `forecast`: projection, vs_average (mission progress bar)
- `summary`: this_month (progress bar current value)
- `recurring`: potentially_forgotten items (action items), stability (achievement)
- `merchants`: top merchants within anomaly categories (quick win detail)

**Animations:**
- Check/uncheck: checkbox fills with spring animation, strikethrough text slides in
- Progress bar fills on mount (0 → current percentage over 800ms, eased)
- Achievement badges slide in from right with stagger
- Quick Win cards have a subtle hover lift (`hover:translate-y-[-2px]`)
- Completion counter number animates when it changes

---

### Design 5: Visual First (`/5/page.tsx`)

**Philosophy:** Data visualization as the primary interface. Minimal text, maximum charts. Every section is a different chart type. Make patterns instantly recognizable through visual encoding. Best for visual thinkers who want to see patterns at a glance.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                    $2,345.67 this mo. │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │              [Calendar heatmap — 90 days]                 │   │
│ │  Jan          Feb          Mar          Each day colored   │   │
│ │  ░░█░█░░  ░█░░██░  █░░...  by amount     Legend: $0─$200  │   │
│ │  █░░█░█░  ░░██░░█  ░█░...                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌────────────────────┐  ┌──────────────────────────────────┐   │
│ │  [Radial chart:    │  │  [Treemap: Category size =       │   │
│ │   Cards by spend]  │  │   spend amount, color = trend]   │   │
│ │                    │  │  ┌─────┬──────────┬─────┐        │   │
│ │     Amex           │  │  │Dine │Groceries │Shop │        │   │
│ │    ●─────○         │  │  │$680 │  $520    │$420 │        │   │
│ │   /       \        │  │  ├─────┴──────────┴─────┤        │   │
│ │ Citi    Cap1       │  │  │  Gas  │Travel │Other │        │   │
│ │                    │  │  │  $180 │ $120  │ $90  │        │   │
│ └────────────────────┘  └──────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  [Waterfall chart: Monthly flow]                          │   │
│ │  Last Mo  ─┐                             ┌─ This Mo       │   │
│ │   $2,100   │  +$680    +$520   -$80      │  $2,345        │   │
│ │            └─→ Dining  Groceries Shopping ─┘               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  [Bump chart: Category ranks over time]                   │   │
│ │  1. Dining ──────────                                     │   │
│ │  2. Groceries ────────                                    │   │
│ │  3. Gas ─────────────                                     │   │
│ │  4. Shopping ────────                                     │   │
│ │     Jan  Feb  Mar  Apr                                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Hover any chart for details · Click to drill down               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- 5+ different chart types in a single view, each revealing a different data dimension:
  1. **Calendar heatmap** (90 days): custom component using a grid of `<div>` cells colored by daily spending amount (green low → yellow mid → red high). 7 rows (days of week) x ~13 columns (weeks). Data from `daily`.
  2. **Radial/Pie chart**: Recharts `<PieChart>` showing spend by card, colored with each card's `color` field.
  3. **Treemap**: Recharts `<Treemap>` showing category breakdown — cell size = spend amount, cell color = trend direction (green if spending down vs avg, red if up).
  4. **Waterfall chart**: custom Recharts `<BarChart>` showing month-over-month change by category. Start bar = last month total, end bar = this month total, middle bars = per-category deltas (positive = red/upward, negative = green/downward).
  5. **Bump chart**: Recharts `<LineChart>` showing category ranking changes over time (rank 1 = top spender). Each line is a category, colored with `CATEGORY_COLORS`.
- Minimal text labels — let visuals speak. Only chart titles, axis labels, and tooltip values.
- Color = meaning throughout: trend direction, severity, card identity
- Bottom hint text: "Hover any chart for details"

**Data Used:**
- `daily`: 90-day calendar heatmap (last 90 days of daily spending)
- `summary.by_card` + `cards`: radial/pie chart with card colors
- `summary.by_category` + `forecast.category_forecasts`: treemap with trend coloring
- `monthly.monthly_by_category`: waterfall (diff between last 2 months) and bump chart (ranking over time)
- `summary`: this_month display in header

**Animations:**
- All charts animate draw on mount, staggered by 200ms each (Recharts `isAnimationActive`, custom delays)
- Calendar heatmap cells pop in day-by-day (CSS animation with `animation-delay` calculated per cell)
- Treemap cells morph sizes smoothly on data change
- Waterfall bars grow from baseline upward/downward
- Bump chart lines draw left-to-right
- Hover on any chart element shows a Recharts `<Tooltip>` with custom dark styling matching the theme

**Chart Implementation Notes:**
- Calendar heatmap: build as a custom component (not a Recharts chart). Render a CSS grid of small `<div>` squares. Color scale: interpolate between `#1E1E26` (zero) → `#10B981` (low) → `#F59E0B` (medium) → `#EF4444` (high).
- Treemap: use Recharts `<Treemap>` with custom `<TreemapContent>` renderer to show category name + amount inside each cell.
- Waterfall: use Recharts `<BarChart>` with stacked bars and invisible base bars to simulate waterfall positioning.
- Bump chart: use Recharts `<LineChart>` — transform `monthly_by_category` data into per-month rankings, plot rank (inverted y-axis, rank 1 at top).

---

## Design Comparison Reference

| Aspect | 1: Command Center | 2: Zen Minimalist | 3: Story Mode | 4: Action Dashboard | 5: Visual First |
|--------|-------------------|-------------------|---------------|---------------------|-----------------|
| **Density** | Very High | Very Low | Medium | Medium | High |
| **Scrolling** | No | Yes | Yes | Some | Some |
| **Primary Focus** | Metrics | Trend | Narrative | Tasks | Patterns |
| **Tone** | Analytical | Calm | Engaging | Motivating | Exploratory |
| **Best For** | Power users | Anxious users | Story lovers | Goal-oriented | Visual thinkers |
| **Numbers:Visuals** | 50/50 | 30/70 | 70/30 | 60/40 | 20/80 |
| **Interactivity** | Medium | Low | Medium | High | Very High |

---

## Verification

1. `npm run dev` — compiles without errors
2. Browser at `localhost:3000` redirects to `/1`
3. Sidebar visible on left with nav items (Import, Transactions, Analytics, Settings) plus Design Trials section (1–5)
4. Clicking nav items navigates between pages, active state updates
5. Sidebar collapse/expand works with smooth animation
6. Each page stub shows its header and placeholder content
7. All 5 design trial routes (`/1` through `/5`) render their respective dashboards
8. Design Trial Navigator floats at top center on all 5 trial pages, current trial is highlighted
9. Clicking navigator links switches between designs without full page reload
10. All designs share the same `useDashboardData()` hook — only one set of API calls regardless of which design is active
11. Dark theme consistent throughout — no white flashes, proper background
12. Fonts load: JetBrains Mono for "Ledgr" logo and financial data, Inter for body text
13. No TypeScript errors (run `npx tsc --noEmit` to verify)
