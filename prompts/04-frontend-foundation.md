# Prompt 4: Frontend Foundation — Types, API Client, Layout, Shared UI

## Goal
Full app shell with collapsible sidebar, typed API client, reusable UI components, and all page routes stubbed. After this prompt, the frontend skeleton is complete and navigable.

## Prerequisites
- Prompt 1 completed: Next.js app with Tailwind dark theme configured
- Prompt 3 completed: Backend API fully functional (needed to know response shapes)

## File Structure After This Prompt

```
frontend/src/
├── app/
│   ├── layout.tsx           # Root layout with fonts, metadata, sidebar
│   ├── globals.css          # Tailwind + custom styles
│   ├── page.tsx             # Redirects to /dashboard
│   ├── dashboard/page.tsx   # Stub
│   ├── import/page.tsx      # Stub
│   ├── transactions/page.tsx # Stub
│   ├── analytics/page.tsx   # Stub
│   └── settings/page.tsx    # Card management + user config
├── components/
│   ├── sidebar.tsx          # Collapsible nav sidebar
│   ├── page-header.tsx      # Reusable page title + description
│   ├── ui/
│   │   ├── card.tsx         # Surface card container
│   │   ├── button.tsx       # Button with variants
│   │   ├── badge.tsx        # Colored badge/pill
│   │   ├── stat-card.tsx    # Stat display with label + value
│   │   ├── skeleton.tsx     # Loading skeleton
│   │   └── empty-state.tsx  # Empty state with icon + message + CTA
│   └── coverage-tracker.tsx # Visual timeline of data coverage
├── hooks/
│   └── use-api.ts           # Generic fetch hook (or keep fetch in lib/api.ts)
├── lib/
│   ├── api.ts               # Typed API client
│   ├── constants.ts         # Card definitions, colors, categories
│   └── utils.ts             # cn(), formatCurrency(), formatDate(), truncateText()
└── types/
    └── index.ts             # All TypeScript interfaces
```

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
```

For `importCSV`, use `FormData` with the file attached, send to `/api/transactions/import`. If `cardCode` is provided, also append it as a form field (`card_code`).

For `getTransactions`, convert the params object to URL search params.

### 5. Collapsible Sidebar (`frontend/src/components/sidebar.tsx`)

`"use client"` component.

- Fixed left sidebar, dark surface background (`bg-surface`)
- Logo/title at top: "Ledgr" in `font-mono`
- Nav items with icons (use simple SVG icons or Unicode symbols — no icon library needed):
  - Dashboard (grid/chart icon)
  - Import (upload icon)
  - Transactions (list icon)
  - Analytics (bar-chart icon)
  - Settings (gear icon) — card management + user config
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

### 10. Page Stubs

**`page.tsx`** (root) — redirect to `/dashboard`:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

**`dashboard/page.tsx`:**
```tsx
// "use client" — will need state for charts
// PageHeader: "Dashboard", "Your spending at a glance"
// EmptyState or placeholder text
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

## Verification

1. `npm run dev` — compiles without errors
2. Browser at `localhost:3000` redirects to `/dashboard`
3. Sidebar visible on left with all 5 nav items (Dashboard, Import, Transactions, Analytics, Settings)
4. Clicking nav items navigates between pages, active state updates
5. Sidebar collapse/expand works with smooth animation
6. Each page shows its header and placeholder content
7. Dark theme consistent throughout — no white flashes, proper background
8. Fonts load: JetBrains Mono for "Ledgr" logo, Inter for body text
9. No TypeScript errors (run `npx tsc --noEmit` to verify)
