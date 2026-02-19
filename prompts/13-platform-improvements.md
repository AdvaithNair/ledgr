# Prompt 13: Platform Improvements — Audit-Driven Polish

## Goal

Based on a comprehensive product audit of all 5 pages, 30+ components, and the full backend API, plus hands-on UX feedback, this prompt addresses:

1. **Remove** dead code, duplicate components, and misplaced UI
2. **Modify** existing features with usability fixes and design polish
3. **Add** missing connections between pages, new components, and quality-of-life features

The theme is **connectedness** — the platform has strong individual pages but they feel isolated. Users see data on the dashboard but can't drill into it, import data but don't know what's stale, and browse transactions without context.

## Prerequisites
- Prompts 01–12 completed (all pages and backend endpoints exist)
- Frontend running on `localhost:3000`, backend on `localhost:8080`

## Design Principles (from PRODUCT.md)
- **Quick check (80%):** User opens dashboard, glances at hero number, maybe scans recent transactions, closes. Under 10 seconds.
- **Deep dive (20%):** After importing, user explores transactions, analytics, maybe adjusts a budget. 5–15 minutes.
- Progressive disclosure — most important info first, details on demand
- Every element must earn its screen space — if it can't be justified, cut it

---

## Part 1: Remove Dead Weight

### 1A. Delete unused base UI components

The codebase has both base and themed versions of several components. Only the themed versions are used. Delete these files:

- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/empty-state.tsx`
- `frontend/src/components/ui/skeleton.tsx`

Also delete `frontend/src/components/ui/stat-card.tsx` if no page imports it.

Before deleting, run `grep -r` across the frontend to confirm zero imports. If any file IS imported somewhere, leave it and update the import to use the themed version instead.

**Justification:** These are never imported anywhere. They were scaffolding from early prompts.

### 1B. Delete experimental dashboard layouts

- `frontend/src/components/dashboards/arctic-glass.tsx`
- `frontend/src/components/dashboards/paper-light.tsx`

**Justification:** Design exploration files from prompt 04. Meridian is the shipped layout. Dead code.

### 1C. Remove test data toggle from production empty state

In `frontend/src/app/page.tsx`, remove the "Use Test Data" button from the empty state:

```tsx
secondaryAction={{ label: "Use Test Data", onClick: toggleTestData }}
```

Also remove the `useTestData` and `toggleTestData` returns from `useDashboardData` if they're only used here. If the hook is also used elsewhere for development, gate test data behind `process.env.NODE_ENV === 'development'` instead.

**Justification:** Real users should never see "Use Test Data." It undermines trust in a finance app.

### 1D. Remove user name banner from Import page

The import page has a persistent banner showing the user name config with edit/dismiss functionality. This belongs in Settings (where it already exists).

Remove the entire user name banner block from `frontend/src/app/import/page.tsx`, including:
- All `userName`, `userNameInput`, `editingUserName`, `savingUserName`, `userNameDismissed` state
- The `getConfig`/`updateConfig` import and effect
- The `handleSaveUserName` function
- The `AnimatePresence` block rendering the banner

**Justification:** This is configuration, not import workflow. The user sets their name once in Settings.

### 1E. Remove scroll indicator dots from dashboard

In `frontend/src/components/dashboards/layouts/meridian.tsx`, remove the 3 animated dots scroll indicator:

```tsx
{/* Scroll indicator */}
<motion.div ... className="mt-16 flex items-center justify-center gap-1">
  {[0, 1, 2].map(...)}
</motion.div>
```

**Justification:** Animated dots are decorative noise. The content below is visible on scroll naturally.

---

## Part 2: Dashboard — Make It the Hub

The dashboard should be the entry point to everything. Right now it's a dead end.

### 2A. Recent Transactions Card

Add a "Recent Transactions" panel below the Categories + Cards grid. Show the 5 most recent transactions with:
- Date (short format: "Feb 12")
- Description (truncated)
- Amount (right-aligned, mono)
- Category badge (colored dot, not full badge — keep it compact)

Below the list, a "View All" link styled as a subtle text button pointing to `/transactions`.

**Data source:** Use the existing `/transactions` endpoint with `per_page=5&sort_by=date&sort_dir=desc`.

**Justification:** The hero number answers "how much," but the recent list answers "on what?" — and it's the bridge to the full transactions page.

### 2B. Conditional Import Prompt

Add a contextual card that appears **only when data is stale** — not a permanent fixture:
- If no imports exist: show "Import your first CSV to get started" with a link to `/import`
- If last import > 14 days ago: show "Your last import was X days ago" with subtle amber styling and link to `/import`
- If data is fresh: show nothing

Fetch last import date from `/import-history` (first record by date desc).

Style: Compact card, accent-left border (like the anomaly alert), positioned above the hero or below the insights carousel. Gentle nudge, not a blocker.

**Justification:** PRODUCT.md identifies "manual CSV download" as the weakest link. We can't fix the manual step, but we can remind users when data is stale.

### 2C. Analytics Preview Card

Add a compact "Insights" panel that surfaces 2-3 key metrics from across the analytics system, with a "View Analytics" link:
- Impulse spending score (from habits) — e.g., "Impulse: 4/10"
- Active subscriptions total (from recurring) — e.g., "Subscriptions: $245/mo"
- Month trajectory (from forecast) — e.g., "On pace: $3,200 (+12%)"

Each metric is a single line with label + value. The whole panel links to `/analytics`.

Fetch from the already-loaded dashboard data (`useDashboardData` hook).

**Justification:** Analytics serves the deep-dive mode (20%), but the dashboard user should see a reason to go there.

### 2D. Clickable Categories → Analytics Deep Dive

Make category names in the dashboard's Categories panel clickable. On click, navigate to `/analytics?tab=habits&category=Groceries`.

On the analytics page, parse URL params:
- If `category` param exists, open the category deep dive modal immediately on mount
- If `tab` param exists, set the active tab

**Justification:** The deep dive already exists — it just needs a doorway from the dashboard. Connects user goal #1 ("where did my money go?") to #6 ("show me patterns").

### 2E. Clickable Merchants → Filtered Transactions

Make merchant names in the Top Merchants panel clickable. On click, navigate to `/transactions?search=MERCHANT_NAME&date_range=all`.

On the transactions page, parse URL search params on mount and populate the search field and date range from them.

**Justification:** Every number on the dashboard should answer "what's behind this?" with one click.

### 2F. Chart Tooltip Styling

The monthly trend chart's Recharts tooltip doesn't match the app's design language:
- Ensure the tooltip uses `theme.bodyFont` for labels and `font-mono` (JetBrains Mono) for values
- Match the tooltip background to `theme.tooltipBg` and border to `theme.tooltipBorder`
- Check all Recharts tooltips across the app for the same issue (analytics page charts too)

The `useTooltipStyle()` hook already exists. The issue is likely in the `formatter` callback or font inheritance.

**Justification:** Typography consistency is a design constraint. Financial data in the wrong font looks careless.

---

## Part 3: Import — Fix Friction, Add Undo

### 3A. Fix Drag-and-Drop Bounce Animation

The drop zone entrance animation uses `type: "spring"` which causes a visible bounce:

```tsx
transition={{ type: "spring", stiffness: 400, damping: 25 }}
```

Replace with a smooth ease-out curve:

```tsx
transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
```

Also check the `dragOver` scale animation — `scale: dragOver ? 1.01 : 1` with spring easing creates subtle jitter. Either remove the scale or use the same ease curve.

**Justification:** Spring animations feel playful, which is wrong for a finance app. Ease-out feels confident.

### 3B. Delete Transactions by Import

Add the ability to delete all transactions from a specific import, directly from the import history table.

**Backend:**
Add a new endpoint: `DELETE /import-history/:id`
- Looks up the import record by ID
- Deletes all transactions whose `hash` was imported in that batch (track which transaction hashes belong to which import — either via a join table or by storing the import_id on each transaction)
- Deletes the import history record itself
- Returns `{ data: { deleted_count: N } }`

If tracking import-to-transaction association is not currently possible, add a migration:
```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES import_history(id) ON DELETE SET NULL;
```
Then update the import flow to write `import_id` on each newly inserted transaction.

**Frontend:**
Add a delete button (small, danger-styled) to each import history row. On click:
1. Show a confirmation modal (not auto-dismiss — this is destructive):
   - Title: "Delete import?"
   - Body: "This will delete all {N} transactions imported from {filename}. This cannot be undone."
   - Two buttons: "Cancel" (ghost) and "Delete" (danger)
2. On confirm, call the delete endpoint
3. On success, remove the row with an exit animation
4. Refetch import history

**Justification:** "I imported with the wrong card" is a real scenario. Currently the only fix is "Delete All Transactions" — nuclear option for a surgical problem.

### 3C. Add Coverage Tracker

Below the drop zone (always visible), render the existing `CoverageTracker` component showing which cards have data in which months.

Fix the component before using it:
- Replace hardcoded `start = new Date(2025, 0, 1)` with dynamic range from actual data
- Replace hardcoded `text-white/30` with theme colors

**Justification:** Users don't know which cards have stale data. This tells them at a glance.

---

## Part 4: Transactions — Better Filters, Better Table

### 4A. Custom Filter Dropdowns

Replace all native `<select>` elements on the Transactions page with custom themed dropdowns. Build a reusable `ThemedDropdown` component in `frontend/src/components/ui/themed-dropdown.tsx`:

```tsx
interface ThemedDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}
```

Each dropdown should:
- Match `ThemedInput` styling (same height, border radius, font, colors)
- Show a chevron icon on the right
- Open a dropdown panel with hover highlight and active check
- Support keyboard navigation (arrow keys, enter, escape)
- Close on outside click

Apply to: Card filter, Category filter, Date range filter on Transactions. Also: card selector on Import page, category select on Transactions bulk action bar, budget category select on Settings.

### 4B. Custom Date Range Picker

Replace the preset date range dropdown with a component that offers:
- **Quick presets** at the top: This Month, Last Month, Last 3 Months, Last 6 Months, This Year, All Time
- **Custom range** at the bottom: when selected, shows two date inputs (start/end) using themed `<input type="date">`

When a custom range is selected, show "Jan 15 – Feb 18" instead of a preset label.

**Justification:** PRODUCT.md open problem: "no way to compare arbitrary date ranges." This enables arbitrary filtering as a prerequisite.

### 4C. Smart Default Date Range

When the transactions page loads with the default "this_month" filter and gets 0 results, automatically fall back:
1. First try "this_month" — if 0 results, try "last_month"
2. If "last_month" also 0 — try "last_3_months"
3. If still 0 — try "all"
4. Update the date range dropdown to reflect the actual range being shown

Use a ref to track fallback attempts and prevent infinite loops.

**Justification:** An empty table on first visit after import is a terrible first impression.

### 4D. Column Header Sorting

Make transaction table column headers clickable to sort:
- **Date** (default: desc) — click toggles asc/desc
- **Description** — click sorts alphabetically
- **Category** — click sorts alphabetically
- **Amount** — click toggles desc/asc

Show a small sort indicator arrow on the active column. Remove the separate "Sort" dropdown from the filter bar (column headers now handle this). Clicking a header updates `sortBy` state and resets to page 1.

**Justification:** Column header sorting is the natural affordance for tables. The separate dropdown is an extra step.

### 4E. Transaction Summary Bar

Add a summary bar between the filter panel and the table showing:
- **Total:** Sum of amounts for the current filtered view
- **Count:** Number of transactions matching filters
- **Avg:** Average transaction amount

Style: Single `ThemedPanel` row with 3 `ThemedStat` elements.

**Backend change:** Add `total_amount` to the transactions endpoint's `meta` response. In the SQL query that already counts `total`, also compute `SUM(amount)`.

**Justification:** User goal #1 is "where did my money go?" A filtered list without totals only half-answers that question.

### 4F. Category Badge Edit Affordance

Category badges on the transactions table are clickable to edit, but there's no visual indication.

On hover, show a tiny pencil icon next to the badge:

```tsx
<button type="button" onClick={() => setEditingCategory(txn.id)} className="group" style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}>
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <ThemedBadge color={categoryColor}>{txn.category}</ThemedBadge>
    <span className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: theme.textMuted }}>
      {/* small pencil SVG */}
    </span>
  </div>
</button>
```

**Justification:** Undiscoverable interactions are effectively missing.

### 4G. Filter Bar Layout

Restructure the filter bar:

```
[Search ────────────────────────────────────────]
[Card ▾]  [Category ▾]  [Date Range ▾]  [Clear]
```

- Search takes full width on its own row
- Filters are pill/chip-style on the second row
- Remove the sort dropdown (replaced by column headers in 4D)
- Add a "Clear" text button that resets all filters — only visible when any filter is active

### 4H. URL Param Parsing

Parse URL search params on mount to pre-populate `search`, `dateRange`, `card`, and `category` state. This enables deep linking from the dashboard (2E merchant clicks) and other pages.

---

## Part 5: Analytics — Bug Fix + Flexible Comparison

### 5A. Fix Forecast Crash

**Bug:** `Cannot read properties of undefined (reading 'toFixed')` at `analytics/page.tsx:1293`

**Root cause:** Frontend type `ForecastData.vs_average.projected_change_pct` expects `projected_change_pct`, but backend sends `projected_diff_pct`. Value is always `undefined`.

**Fix (do both):**

1. **Type fix:** Update `frontend/src/types/index.ts` — change `projected_change_pct` to `projected_diff_pct` in `ForecastData`. Update all references in `analytics/page.tsx` and `meridian.tsx`.

2. **Null guard:** Add safety in the ForecastTab:
```tsx
const diffPct = data.vs_average.projected_diff_pct ?? 0;
```

Also check `meridian.tsx` — the Spending Velocity section reads `forecast.vs_average.projected_change_pct` which is also wrong.

### 5B. Flexible Time Comparison (Month-over-Month)

Expand the "Year-over-Year" tab into a "Compare" tab:

1. Rename tab from "Year-over-Year" to "Compare"
2. Add a toggle: `[Month ▾ vs Month ▾]` | `[Year vs Year]`
3. For MoM: two month pickers (dropdowns listing available months). Default: current vs. last month
4. Show: total spending per period, percentage change, category-by-category comparison, top merchants that changed most

**Data source:** Existing `/stats/monthly` endpoint. No new backend endpoint — client-side filtering and comparison.

**Not adding Week-over-Week:** CSV imports are monthly. Weekly boundaries don't align with data cadence.

**Justification:** "Am I spending more than usual?" is user goal #2. YoY needs 2+ years of data. MoM works from month two.

### 5C. URL Param Parsing for Analytics

Parse URL search params on mount:
- If `tab` param exists, set active tab
- If `category` param exists, open category deep dive modal

This enables the dashboard → analytics flow (2D).

---

## Part 6: Settings — Form Polish + Better Theme Picker

### 6A. Card Form Layout — Code + Color Side by Side

Put Code and Color fields on the same row (50/50 width):

```
Label:   [American Express Gold          ]
Code:    [amex        ]  Color: [#C5A44E] ■
```

Use `display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`.

**Justification:** Code and color are short values. Full-width inputs waste space.

### 6B. Themed Color Picker

Replace the hex text input for card color with a color picker popover:
- **Preset palette:** 8-10 curated colors (include Amex gold, Citi blue, CapOne red + complementary options)
- **Custom hex input:** Below the palette
- **Live preview:** Swatch updates in real-time

Don't use native `<input type="color">`. Build `ThemedColorPicker` in `frontend/src/components/ui/themed-color-picker.tsx`.

**Justification:** Users shouldn't need to know hex codes.

### 6C. CSV Mapping Fields

Expand the card edit/add form to include CSV mapping fields:
- `header_pattern` (text input)
- `delimiter` (select: comma, tab, pipe, semicolon)
- `date_column` (text input)
- `date_format` (text input with examples)
- `description_column` (text input)
- `amount_column` (text input)
- `category_column` (text input, optional)
- `member_column` (text input, optional)
- `skip_negative_amounts` (checkbox)

Group under an expandable "CSV Mapping" section. Collapsed by default for existing cards, expanded for new cards.

**Justification:** Without this, users can't add new card types from the UI.

### 6D. Info Tooltips for Non-Obvious Fields

Add small info icons (circled "i", 14px, muted) next to:
- **Code:** "A short identifier for this card, used internally for CSV matching. Use lowercase, no spaces."
- **Header Pattern:** "Comma-separated column names from the first row of your CSV. Used to auto-detect card type."
- **Date Format:** "How dates appear in your CSV. Common: %m/%d/%Y (01/15/2025), %Y-%m-%d (2025-01-15)"

Do NOT add info icons to: Label, Color, Delimiter (all obvious).

On click (not hover), show a small popover. Close on outside click or escape.

**Justification:** "Code" is developer jargon. Without explanation, users will guess wrong.

### 6E. Budget Category — Custom Dropdown

Replace the native `<select>` for budget category with the `ThemedDropdown` component from 4A. Ensure it matches the height of the adjacent budget amount `ThemedInput`.

**Justification:** Visual consistency. Every native form element is a crack in the design system.

### 6F. Theme Selector — Grid with Previews

Redesign the Settings theme section as a 2x2 grid of theme preview cards:

```
┌─────────────┐  ┌─────────────┐
│  Arctic Dark │  │ Arctic Light│
│  [preview]   │  │  [preview]  │
└─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│  Paper Dark  │  │ Paper Light │
└─────────────┘  └─────────────┘
```

Each card shows:
- A mini preview (~120x80px with detail)
- Theme name below
- Selected state: accent border + check icon

Replaces the current PillToggle pair (Style + Mode). Single click selects both, which is more intuitive.

Reuse the `ThemePreview` component from `sidebar.tsx` or create a larger variant.

**Justification:** Two toggles require understanding theme architecture. A grid of 4 with previews requires zero understanding.

---

## Part 7: Sidebar — Freshness Indicator

### 7A. Data Freshness Indicator

Add a subtle freshness indicator below nav items and above the theme picker:
- "Last import: 2 days ago" (if recent)
- "Last import: 3 weeks ago" (warning color if > 2 weeks)
- Nothing if no imports exist yet

Fetch from `/import-history` (first record's `imported_at` sorted desc). Cache on mount.

When collapsed, show just a colored dot (green = recent, amber = > 2 weeks, red = > 1 month).

**Justification:** Prevents users from making decisions on outdated data.

---

## Verification Checklist

1. **Build:** `cd frontend && bun run build` — zero TypeScript errors
2. **No dead imports:** Grep for any imports of deleted files
3. **Dashboard:**
   - Recent transactions card shows 5 most recent, "View All" navigates to `/transactions`
   - Stale data prompt appears when last import > 14 days ago, hidden when fresh
   - Analytics preview card shows impulse/subscriptions/trajectory
   - Category click → analytics deep dive opens
   - Merchant click → transactions filtered correctly
   - Chart tooltip uses themed fonts (mono for values)
4. **Import:**
   - Drop zone enters smoothly (no spring bounce)
   - Coverage tracker shows card-by-month grid
   - Each import history row has a delete button
   - Delete shows confirmation modal, deletes transactions, removes row
5. **Transactions:**
   - All filters are custom themed dropdowns (no native selects)
   - Date range supports custom start/end dates
   - Smart fallback: importing old data then visiting shows data, not empty
   - Column headers sort on click with arrow indicator
   - Sort dropdown removed from filter bar
   - Filter bar layout is search (full) + chips (row)
   - Summary bar shows total/count/avg
   - URL params populate filters (from dashboard merchant click)
   - Category badge hover → pencil icon
6. **Analytics:**
   - Forecast tab doesn't crash
   - "Compare" tab offers MoM and YoY
   - MoM defaults to current vs. previous month
   - URL params open correct tab and/or category modal
7. **Settings:**
   - Card form: code + color on same row
   - Color field opens themed color picker with palette
   - CSV mapping fields in expandable section
   - Info icons on Code, Header Pattern, Date Format fields
   - Budget category uses custom dropdown, same height as input
   - Theme section is a 2x2 preview grid
8. **Sidebar:**
   - Freshness indicator shows last import date
   - Collapsed: colored dot

## File Impact Summary

### Delete (6-7 files):
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/empty-state.tsx`
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/components/ui/stat-card.tsx` (if unused)
- `frontend/src/components/dashboards/arctic-glass.tsx`
- `frontend/src/components/dashboards/paper-light.tsx`

### New files (2):
- `frontend/src/components/ui/themed-dropdown.tsx` — reusable custom dropdown
- `frontend/src/components/ui/themed-color-picker.tsx` — color picker popover

### Backend changes:
- New migration: add `import_id` column to transactions table
- New endpoint: `DELETE /import-history/:id`
- Modify import flow to write `import_id` on inserted transactions
- Add `total_amount` to transactions endpoint's `meta` response

### Modified frontend files (~10):
- `frontend/src/app/page.tsx` — remove test data toggle
- `frontend/src/components/dashboards/layouts/meridian.tsx` — remove scroll dots, add recent transactions/import prompt/analytics preview, clickable categories/merchants
- `frontend/src/app/import/page.tsx` — remove user name banner, fix animation, add delete to history, add coverage tracker
- `frontend/src/app/transactions/page.tsx` — custom filters, date picker, smart fallback, column sorting, summary bar, edit affordance, filter bar layout, URL params
- `frontend/src/app/analytics/page.tsx` — fix forecast bug, rename YoY to Compare, add MoM, URL params
- `frontend/src/app/settings/page.tsx` — card form layout, color picker, CSV mapping, info icons, budget dropdown, theme grid
- `frontend/src/components/sidebar.tsx` — add freshness indicator
- `frontend/src/components/coverage-tracker.tsx` — fix hardcoded start date, use theme colors
- `frontend/src/types/index.ts` — fix `projected_change_pct` → `projected_diff_pct`
- `frontend/src/hooks/use-dashboard-data.ts` — gate test data behind dev env

## What Was NOT Included (and why)

- **Week-over-Week comparison:** CSV imports are monthly. Weekly boundaries don't align with data cadence, producing misleading partial comparisons.
- **Sort on ALL table headers across all pages:** Analytics tables are pre-sorted by relevance. User sorting there fights the designed hierarchy. Scoped to Transactions only.
- **Info icons on every Settings field:** Label, Color, and Delimiter don't need explanation. Over-explaining simple things insults the user.
