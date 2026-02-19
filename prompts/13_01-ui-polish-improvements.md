# Prompt 13_01: UI Polish & Usability Improvements

## Goal

Address hands-on UX feedback across all 5 pages. Each change is scoped, justified, and designed to respect the existing design system and PRODUCT.md principles.

## Prerequisites
- Prompts 01–13 completed
- Frontend running on `localhost:3000`, backend on `localhost:8080`
- Existing themed components: `ThemedPanel`, `ThemedLabel`, `ThemedDropdown`, `ThemedInput`, `ThemedBadge`, `ThemedColorPicker`, `useTooltipStyle()`, `useTheme()`

---

## Part 1: Dashboard Fixes

### 1A. Categories & Cards — Switch to Donut Charts, Match Heights

**Problem:** Categories and Cards sections use thin proportion bars that are hard to read and visually mismatched in height.

**Solution:** Replace both with small donut charts (PieChart with inner radius) at equal heights. Donut charts are superior here because they show part-of-whole relationships — exactly what "category share of total spend" and "card share of total spend" represent.

**In `meridian.tsx`, Categories section (lines ~1135-1197):**

Replace the list of `ProportionBar` items with a `PieChart` + `Pie` (Recharts) donut:
- Chart dimensions: 160×160px, `innerRadius={50}`, `outerRadius={70}`
- Each slice uses the category's color from `CATEGORY_COLORS`
- Legend to the right of the donut: category name + amount, stacked vertically, max 5 items
- On slice hover: show category name and `formatCurrency(amount)` in a custom tooltip (use `useTooltipStyle()`)
- Clicking a slice still navigates to `/analytics?tab=habits&category=NAME`

**In `meridian.tsx`, Cards section (lines ~1199-1244):**

Same donut treatment:
- Each slice uses the card's database color
- Legend: card label + amount
- Dimensions match categories chart exactly

**Layout:** Both sections in a `grid grid-cols-2` with `items-stretch` so they always match height. Wrap each in `ThemedPanel` with identical padding.

```
┌─────────────────────┐  ┌─────────────────────┐
│  [donut]  Cat 1 $X  │  │  [donut]  Amex $X   │
│           Cat 2 $X  │  │           Citi $X    │
│           Cat 3 $X  │  │           CapOne $X  │
│  Categories         │  │  Cards               │
└─────────────────────┘  └─────────────────────┘
```

**Technical notes:**
- Import `PieChart, Pie, Cell, Tooltip` from `recharts`
- Use `<Cell key={i} fill={color} />` for each slice
- The `ProportionBar` component (lines ~112-144) can remain — other sections may use it. Just stop using it here.

### 1B. Fix Chart Tooltip Design

**Problem:** Recharts tooltips don't consistently use the design system fonts. Values should be in `font-mono` (JetBrains Mono), labels in the body font.

**Solution:** Create a shared custom tooltip component instead of relying on Recharts' default `<Tooltip>` with inline `contentStyle`.

**Create a new component in `themed-components.tsx`:**

```tsx
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

export function ChartTooltip({ active, payload, label, formatValue, formatLabel }: ChartTooltipProps) {
  const { theme } = useTheme();
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: theme.tooltipRadius,
      padding: '8px 12px',
      backdropFilter: theme.mode === 'dark' ? 'blur(8px)' : undefined,
      boxShadow: theme.tooltipShadow !== 'none' ? theme.tooltipShadow : undefined,
    }}>
      {label && (
        <div style={{ color: theme.textMuted, fontFamily: theme.bodyFont, fontSize: 11, marginBottom: 4 }}>
          {formatLabel ? formatLabel(label) : label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 2 : 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: theme.textMuted, fontFamily: theme.bodyFont, fontSize: 12 }}>{entry.name}</span>
          <span style={{ color: theme.text, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, marginLeft: 'auto' }}>
            {formatValue ? formatValue(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Apply everywhere Recharts tooltips are used:**
- `meridian.tsx` trend chart — replace `<Tooltip contentStyle={...} formatter={...}>` with `<Tooltip content={<ChartTooltip formatValue={formatCurrency} />} />`
- All analytics page charts (bar charts, area charts, line charts)
- The new donut charts from 1A

This ensures every tooltip in the app has: themed background/border, body font for labels, mono font for values, consistent padding and dot indicators.

### 1C. Rework Spending Velocity Section

**Problem:** The "month progress" bar and "projected vs average" bar are confusing. Users don't understand what they represent.

**Solution:** Replace with a cleaner "Month Pace" card that communicates three things clearly:

**Design — "Month Pace" panel:**

```
┌──────────────────────────────────────────────────────┐
│  Month Pace                                          │
│                                                      │
│  Spending                 Time                       │
│  ████████████░░░░░░░░░░   ████████████████░░░░░░░░   │
│  68% of projected         61% through February       │
│                                                      │
│  $167/day avg             Projected: $4,200          │
│  +8% vs last month        On track ●                 │
└──────────────────────────────────────────────────────┘
```

**Left column — Spending pace:**
- Label: "Spending"
- Progress bar: filled = `(spent / projected) * 100`, color = accent
- Below: "X% of projected" in muted text
- Below that: "$X/day avg" and "±X% vs last month"

**Right column — Time progress:**
- Label: "Time"
- Progress bar: filled = `(days_elapsed / days_in_month) * 100`, color = muted/gray
- Below: "X% through [Month]"
- Below that: "Projected: $X" and status indicator:
  - Green dot + "On track" if projected ≤ 3-month average
  - Amber dot + "Slightly over" if projected is 1-15% above average
  - Red dot + "Over pace" if projected is >15% above average

**Do NOT repeat the total spent** — the hero stat already shows that prominently. The pace section's job is to show *context the hero can't*: are you ahead or behind the calendar? The percentages tell the story. If the spending bar is at 68% but the time bar is at 61%, you're spending faster than the month is passing — that's the insight.

**Do NOT show budget info here.** PRODUCT.md says "Not a budgeting app — budgets exist as optional guardrails, not the core experience." Budget progress already has its own conditional section on the dashboard. Don't give it duplicate real estate.

**Data sources:** All from existing `useDashboardData` — `summary.total`, `forecast.projected_total`, `forecast.daily_rate`, `forecast.vs_average`.

### 1D. Add More Analytics to the Analytics Preview Tab

**Problem:** The analytics preview tab on the dashboard is shorter than the recent transactions section beside it.

**Solution:** Add compact metric cards to fill the space. The analytics preview should show 4 quick-glance metrics in a 2×2 grid. Every metric must answer "so what?" — if the user can't act on it, don't show it.

```
┌──────────────────┐ ┌──────────────────┐
│ Impulse: 3/10    │ │ Top Category:    │
│ ▓▓▓░░░░░░░░      │ │ Dining $842      │
└──────────────────┘ └──────────────────┘
┌──────────────────┐ ┌──────────────────┐
│ Subs: $245/mo    │ │ vs Last Month:   │
│ 8 active         │ │ -12%             │
└──────────────────┘ └──────────────────┘
```

Each cell is a mini `ThemedPanel` with:
- Muted label (10px uppercase)
- Value in `font-mono` (14px, 600 weight)
- Optional sparkline or indicator (use thin bars or dots, not full charts)

**Data sources from `useDashboardData`:**
1. Impulse score → `habits.impulse_score` — actionable behavioral insight
2. Top category → first item from `summary.categories` sorted by total — answers "where's the money going?"
3. Subscriptions → `recurring.total_monthly`, `recurring.active_count` — recurring cost awareness
4. vs Last Month → percentage change from `forecast.vs_average` or computed from monthly data — directly answers user goal #2 ("Am I spending more than usual?")

**Why 4, not 6:** Only include metrics that answer "so what?" Metrics like "34 unique merchants" or "biggest single transaction" are trivia, not insights. The user can't change behavior based on them. 4 strong metrics > 6 padded ones. If the grid doesn't quite match the transactions panel height, add a "View Analytics" link row below — don't add weak data to fill pixels.

---

## Part 2: Import Fixes

### 2A. Redesign Data Coverage Visual

**Problem:** The current coverage tracker uses tiny 8×5px colored squares in a grid. It's hard to read and doesn't match the app's design language.

**Solution:** Redesign as a horizontal timeline per card, showing data presence as continuous bars.

**In `coverage-tracker.tsx`, replace the grid with:**

```
┌──────────────────────────────────────────────────────┐
│  Data Coverage                                       │
│                                                      │
│  ● Amex Gold                                         │
│  ░░░░░░░░░░░░████████████████████░░░░░░░░            │
│                                                      │
│  ● Citi Double                                       │
│  ░░░░████████████████████████████████████████         │
│                                                      │
│  ● Capital One                                       │
│  ████████████████████████████████████████████         │
│                                                      │
│  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep         │
└──────────────────────────────────────────────────────┘
```

**Implementation:**
- Each card gets a row with: color dot + card label, then a horizontal bar
- The bar spans the full date range of all data (dynamic, from earliest to latest month)
- Months with data: filled with the card's color at 60% opacity
- Months without data: filled with `theme.border` (subtle empty state)
- **One shared time axis at the bottom** — do NOT repeat month labels under each card row. All bars align to the same axis, like a Gantt chart. This keeps it compact and readable.
- Gaps in data (e.g., card has Jan and March but not February) are visually obvious as empty segments — no warning icons or striped patterns needed. The empty space speaks for itself. If you want subtle differentiation, use a slightly darker empty color for gaps vs. months outside the card's range.
- On hover over a segment: tooltip with "{Month Year}: {count} transactions, ${total}"

**Key changes from current implementation:**
- Remove the grid layout — horizontal bars are more natural for time-series data
- Dynamic date range instead of hardcoded start date
- Use theme colors throughout (no hardcoded `rgba`)
- Add transaction count context on hover (not just "has data / no data")
- Make the component taller and more readable — it's important information that was squeezed too small

**Data source:** Same `monthly_by_card` from the existing `MonthlyData` type. Enhance hover data with count from the same array.

### 2B. Delete Confirmation Modal

**Problem:** The inline two-state delete button is easy to accidentally trigger and doesn't give enough context about what's being deleted.

**Solution:** Replace inline confirmation with a proper modal dialog.

**Create a reusable `ConfirmModal` component in `frontend/src/components/ui/confirm-modal.tsx`:**

```tsx
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;    // default: "Delete"
  confirmVariant?: 'danger' | 'accent'; // default: 'danger'
  loading?: boolean;
  children?: React.ReactNode; // for additional content like transaction preview
}
```

**Modal design:**
- Fixed overlay: `background: rgba(0,0,0,0.6)`, `backdropFilter: blur(4px)`
- Centered card: `ThemedPanel`, max-width 480px, rounded corners
- Title in `theme.text`, 16px, 600 weight
- Description in `theme.textMuted`, 13px
- **Transaction preview section** (children slot): Show a compact list of up to 5 recent transactions from that import file:
  - Date (short), description (truncated), amount (mono)
  - Below: "and X more transactions" if > 5
  - Style: subtle bordered box inside the modal with `theme.surfaceHover` background
- Footer: "Cancel" (ghost button, left) and "Delete X transactions" (danger button, right)
- Framer Motion: scale 0.96→1, opacity 0→1 entrance; reverse on exit
- Close on Escape key and overlay click

**In `import/page.tsx`:**
- Replace `deleteConfirmId` pattern with `deleteModalImport: ImportRecord | null` state
- Trash button click → `setDeleteModalImport(record)` (opens modal)
- Modal shows: title "Delete import?", description "This will permanently remove all {N} transactions imported from {filename} on {date}."
- Fetch the 5 most recent transactions for the import (use existing `/transactions?import_id=X&per_page=5` if the endpoint supports it, otherwise filter client-side from cached data)
- On confirm → call delete endpoint, close modal, remove row with exit animation

**If `/transactions` doesn't support `import_id` filter:** Add it. In `backend/src/routes/transactions.rs`, add `import_id` to `TransactionQuery` and add a condition: `conditions.push(format!("import_id = ${}", bind_idx))`. This is a small change — the `import_id` column already exists from Prompt 13.

---

## Part 3: Transactions Fixes

### 3A. Inline Filters with Search Bar

**Problem:** Filters are on a separate row below the search bar, taking up vertical space.

**Solution:** Put search and filters on one line.

**Layout:**

```
[🔍 Search transactions...          ] [Card ▾] [Category ▾] [Date ▾] [Clear]
```

**Implementation in `transactions/page.tsx`:**
- Wrap search + filters in a single flex row: `display: flex; gap: 8px; align-items: center;`
- Search input: `flex: 1; min-width: 200px;` (takes remaining space)
- Each `ThemedDropdown`: fixed width ~120px with abbreviated trigger labels ("Card", "Category", "Date" — not "All Cards", "All Categories"). When a filter is active, show the selected value in the trigger instead.
- "Clear" text button: only visible when filters are active, compact, accent color
- The narrower dropdowns (~120px vs 140px) buy ~60px back, making the single-line layout reliable on standard viewports (960px+ content area with sidebar)
- Remove the separate filter row

**Custom date range:** When "Custom" is selected from the date dropdown, render the start/end date inputs on a new row below, spanning full width. This row only appears for custom dates.

**Responsive behavior:** On narrow viewports (< 768px), allow the row to wrap. Search stays full-width on first line, filters wrap to second line. Use `flex-wrap: wrap`.

### 3B. Remove Analytics Refresh Animation

**Problem:** The total/count/average stats flicker with a re-render animation every time filters change. It's distracting for data that should feel stable.

**Solution:** Remove the `motion.div` wrapper from the analytics/summary bar.

**In `transactions/page.tsx` (lines ~585-642):**
- Remove the `motion.div` wrapper with `initial`, `animate`, and `transition` props
- Replace with a plain `div`
- Keep the `ThemedPanel` styling
- Use `tabular-nums` on the values (already present) so numbers don't shift width when changing
- Optional: add a subtle `transition: color 0.15s` CSS transition on the value elements so numbers crossfade rather than jump — but no layout animation

### 3C. Add Card Sorting

**Problem:** Card column header is not sortable, even though the backend already supports `sort_by=card`.

**Solution:** Make the Card column sortable.

**In `transactions/page.tsx`:**
- The Card column header (line ~860) currently renders as a non-clickable `ThemedTh`
- Add the same `onClick={() => handleColumnSort("card")}` handler used by other sortable columns
- Add the `SortArrow` indicator
- Add `cursor: pointer; userSelect: none` styling

This is a one-line-per-change fix — the backend already accepts `card` as a sort column (line 34 of `transactions.rs`).

---

## Part 4: Analytics — Add Education & Guidance

**Problem:** The analytics page is powerful but intimidating. Users don't know how to interpret charts or what actions to take.

**Solution:** Add contextual education through three mechanisms:

### 4A. Tab Descriptions

Add a brief description below each tab's title that explains what the tab helps you understand:

- **Habits:** "Discover your spending patterns — when you spend most, impulse tendencies, and which merchants dominate."
- **Patterns:** "See spending rhythms across days, weeks, and the full year. The heatmap highlights your busiest periods."
- **Subscriptions:** "Track recurring charges and catch subscriptions you may have forgotten about."
- **Forecast:** "Predict where this month's spending will land based on your current pace and historical patterns."
- **Compare:** "Compare spending between months or years to spot trends and seasonal changes."

**Style:** `theme.textMuted`, 13px, `theme.bodyFont`, max-width 600px, margin-bottom 20px. Placed directly below the tab selector, above the content.

### 4B. Chart Annotations (Targeted, Not Exhaustive)

Add inline helper text only where the visualization is genuinely non-obvious. The product-design red flag applies: "If it needs explanation, simplify the design." These annotations are the lightweight version — they clarify intent without adding UI clutter.

- **Impulse Score (Habits):** Below the score bar, add: "Measures spontaneous spending patterns. Lower is more disciplined."
- **Category Creep (Habits):** Add header text: "Categories where spending is trending up month-over-month."
- **365-Day Heatmap (Patterns):** Add: "Darker squares = more spending. Hover for details." below the legend.
- **Projection Methods (Forecast):** Do NOT add 4 individual "(i)" info popovers — most users don't care about Linear vs. EWMA vs. Day-Weighted. Instead, show the "Recommended" projection prominently as the primary number. Collapse the method comparison into a "Show all methods" toggle that's collapsed by default. This simplifies the UI rather than explaining complexity.

**Style for annotations:** `theme.textMuted`, 11px, italic, placed directly below the relevant chart. No icons, no popovers — just text.

### 4C. Empty State Guidance

When a tab has no data (e.g., no recurring transactions found, or not enough history for forecasts), show helpful empty states:

- **No habits data:** "Import at least 2 months of data to see spending habits."
- **No patterns data:** "Need more transaction history. Import CSV files to build your spending patterns."
- **No subscriptions:** "No recurring charges detected yet. Subscriptions are identified after seeing the same merchant charge 3+ times."
- **No forecast data:** "Need at least one full month of data to generate forecasts."
- **No comparison data:** "Import data from multiple months to compare spending over time."

**Style:** Centered in the panel, muted text, with a subtle icon (calendar, chart, or clock depending on context). Link to `/import` with "Import data" action.

---

## Part 5: Settings Fixes

### 5A. Smart CSV Column Mapping via Example Upload

**Problem:** Manually filling in CSV column mappings is error-prone and confusing. Users have to understand their CSV structure.

**Solution:** Add an "Upload Example CSV" button that auto-detects column mappings.

**Implementation:**

Add above the CSV mapping fields (within the expandable section):

```
┌──────────────────────────────────────────────────────┐
│  CSV Column Mapping                                  │
│                                                      │
│  [Upload Example CSV]  or fill in manually below     │
│                                                      │
│  (after upload:)                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │ Detected columns: Date, Description, Amount,   │  │
│  │ Category, Card Member                           │  │
│  │                                                 │  │
│  │ Preview:                                        │  │
│  │ 01/15/2025 | AMAZON.COM | $47.99 | Shopping    │  │
│  │ 01/14/2025 | WHOLE FOOD | $82.31 | Groceries   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Header Pattern: [Date,Description,Amount,Category]  │
│  Date Column:    [Date           ] auto-filled       │
│  Date Format:    [%m/%d/%Y       ] auto-detected     │
│  Description:    [Description    ]                   │
│  Amount Column:  [Amount         ]                   │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

**Auto-detection logic (client-side):**

1. Read the CSV file with PapaParse (already a dependency)
2. Extract headers from the first row
3. Set `header_pattern` to the full comma-separated header string
4. For each mapping field, use keyword matching:
   - `date_column`: look for header containing "date", "posted", "transaction date"
   - `description_column`: look for "description", "merchant", "payee", "memo"
   - `amount_column`: look for "amount", "charge", "debit"
   - `debit_column`: look for "debit"
   - `credit_column`: look for "credit", "payment"
   - `category_column`: look for "category", "type"
   - `member_column`: look for "member", "card member", "name"
5. For `date_format`: parse the first non-header date value, try common formats (`%m/%d/%Y`, `%Y-%m-%d`, `%m-%d-%Y`, `%d/%m/%Y`), select the one that parses successfully
6. Show a 2-row preview of parsed data so the user can verify
7. Pre-fill all mapping fields, but leave them **editable** — the auto-fill is a suggestion, not a lock
8. **Show confidence indicators** next to each auto-filled field:
   - Green dot: "Detected" — exact keyword match (header literally says "Date", "Amount", "Description")
   - Amber dot: "Best guess — verify" — fuzzy match (header says "Posted" → mapped to date, "Memo" → mapped to description)
   - Leave fields empty if no match found — don't guess wildly. An empty field the user fills in is better than a wrong auto-fill they trust.

**The CSV file is NOT stored** — it's only used for detection. Show a note: "This file is only used to detect column names. It won't be imported."

**File input:** Style as a small secondary button, not a full drop zone. Use `<input type="file" accept=".csv">` hidden behind a styled button.

### 5B. Required Field Indicators

**Problem:** Users don't know which fields are required when adding a card.

**Solution:** Add `*` to required field labels.

**Required fields (add red asterisk):**
- Label *
- Code *
- Color * (has a default, but still required)

**Optional fields (no asterisk):**
- All CSV mapping fields (the whole section is optional if the card won't be used for import)

**Implementation:**
- After each required label text, add: `<span style={{ color: theme.danger, marginLeft: 2 }}>*</span>`
- Add a small note at the top of the card form: `<span style={{ color: theme.textMuted, fontSize: 11 }}>* Required</span>`

### 5C. Fix Color Picker Cropping

**Problem:** When CSV column mapping is collapsed, the color picker dropdown gets clipped by the panel's `overflow: hidden`.

**Solution:** Two changes:

1. **Remove `overflow: hidden` from the card form panel.** If `overflow: hidden` is on the `ThemedPanel` or the `AnimatePresence` wrapper, use `overflow: visible` instead. The CSV mapping section should use `max-height` animation rather than relying on overflow clipping.

2. **Use a portal for the color picker dropdown.** Render the color picker popover in a React portal (`createPortal` to `document.body`) positioned absolutely relative to the trigger button. This guarantees it renders above all other content regardless of parent overflow.

**In `themed-color-picker.tsx`:**
- Calculate trigger button position with `getBoundingClientRect()`
- Render the dropdown in a portal with `position: fixed`, `top` and `left` from the bounding rect
- Add a `z-index: 50` to ensure it's above all panels
- Close on outside click and Escape (already implemented)

### 5D. Fix Color Picker Button Overflow

**Problem:** The color picker trigger button sticks out of the dropdown/form area.

**Solution:** Ensure the color picker button matches the height and styling of `ThemedInput`:

- Height: match `ThemedInput` (likely 36-38px)
- Border: `1px solid ${theme.border}`
- Border-radius: same as `ThemedInput`
- Width: `100%` of its grid column
- Content: color swatch (16×16 circle) + hex code text + chevron icon, all inside the button
- On open: border color changes to `theme.accent` (same as input focus)

If the button is currently larger than the input, it's likely a padding issue. Audit the padding to match: `padding: 8px 12px`.

### 5E. Color-Coded Category Dropdowns

**Problem:** Category dropdowns (in Settings budgets and Transactions category edit) show plain text without visual distinction.

**Solution:** Add color dots to category dropdown options.

**In `ThemedDropdown`, add support for an optional `icon` or `dot` prop on options:**

```tsx
interface DropdownOption {
  label: string;
  value: string;
  dotColor?: string; // optional colored dot before label
}
```

**Rendering:**
- If `dotColor` is set, render a small circle (8px) before the label text in that color
- Apply to: category dropdowns in Transactions filter, Transactions inline edit, Settings budget category selector

**Category colors:** Import `CATEGORY_COLORS` from constants and map each category to its color:
```tsx
const categoryOptions = CATEGORIES.map(cat => ({
  label: cat,
  value: cat,
  dotColor: CATEGORY_COLORS[cat] || theme.textMuted
}));
```

### 5F. Redesign Theme Previews

**Problem:** The current theme preview cards in Settings show basic color swatches. They look flat and don't convey the actual theme experience.

**Solution:** Reuse the mini UI mockup pattern from the sidebar's theme picker, but at a larger size.

**In `settings/page.tsx`, theme section (lines ~1257-1349):**

Replace the current preview cards with larger versions of the sidebar's `ThemePreview` component (from `sidebar.tsx` lines 86-257):

**Each preview card (~200×140px):**
```
┌──────────────────────────────┐
│ ┌──┐ ┌──────────────────┐   │
│ │▓▓│ │ ■■■ heading       │   │
│ │▓▓│ │ ━━━━━━ ━━━━━      │   │
│ │▓▓│ │ ▓▓▓▓▓ ▓▓▓         │   │
│ │▓▓│ │ ━━━ ━━━━━━━       │   │
│ │  │ │                   │   │
│ └──┘ └──────────────────┘   │
│                              │
│  Arctic Dark            ✓   │
└──────────────────────────────┘
```

- Left "sidebar" strip with nav dot indicators in accent color
- Right "content" area with:
  - Small heading bar (accent color)
  - Two lines of "text" (muted color, thin rectangles)
  - Small "chart" bars (accent color, different widths)
- Background uses the actual theme's background color
- Surface areas use the theme's surface color
- Border uses the theme's border color
- Active theme: 2px accent border + checkmark
- Inactive: 1px border, hover brightens

**Import or extend `ThemePreview`** from `sidebar.tsx` — don't duplicate the code. If the sidebar version is too tightly coupled, extract it into a shared component `frontend/src/components/ui/theme-preview.tsx` and use it in both places.

**Grid:** 2×2 with 12px gap, each card clickable to select that theme.

---

## Verification Checklist

1. **Build:** `cd frontend && bun run build` — zero TypeScript errors
2. **Dashboard:**
   - Categories section is a donut chart with colored slices + right-side legend
   - Cards section is a donut chart, same height as categories
   - Both wrapped in `grid grid-cols-2 items-stretch`
   - All chart tooltips use `ChartTooltip` — mono font for values, body font for labels
   - Spending velocity replaced with "Month Pace" — two progress bars side by side (spending % vs. time %). No dollar amount duplicating the hero stat. No budget info (lives in its own section).
   - Analytics preview has 4 metric cards in 2×2 grid (impulse, top category, subs, vs last month). Each metric answers "so what?"
3. **Import:**
   - Coverage tracker shows horizontal bars per card with one shared time axis at bottom (not grid squares, not repeated labels)
   - Hover on bar segment shows tooltip with count and total
   - Delete button opens modal (not inline confirmation)
   - Modal shows import details + up to 5 recent transactions preview
   - Modal has Cancel + Delete buttons, close on Escape/overlay click
4. **Transactions:**
   - Search bar and 3 filter dropdowns on one line
   - Summary stats (total/count/avg) have no entrance animation, values don't flicker
   - Card column header is clickable to sort (arrow indicator shows)
5. **Analytics:**
   - Each tab has a description below the selector
   - Impulse score, category creep, and heatmap have brief annotations
   - Forecast shows "Recommended" projection prominently, other methods collapsed behind toggle
   - Empty state messages guide users to import data
6. **Settings:**
   - "Upload Example CSV" button above mapping fields, auto-fills on upload with confidence indicators (green = exact match, amber = fuzzy match)
   - Required fields marked with red `*`
   - Color picker doesn't get clipped when mapping section is collapsed
   - Color picker button matches `ThemedInput` height, doesn't overflow
   - Category dropdowns show colored dots
   - Theme previews are mini UI mockups (not flat swatches), 2×2 grid
7. **Cross-cutting:**
   - No hardcoded colors — all use theme tokens
   - All Recharts tooltips use the shared `ChartTooltip` component
   - Framer Motion animations are smooth ease-out, no spring bounce

## File Impact Summary

### New files (1-2):
- `frontend/src/components/ui/confirm-modal.tsx` — reusable confirmation modal
- `frontend/src/components/ui/theme-preview.tsx` — shared theme preview (if extracted from sidebar)

### Modified files (~8-10):
- `frontend/src/components/dashboards/themed-components.tsx` — add `ChartTooltip` component
- `frontend/src/components/dashboards/layouts/meridian.tsx` — donut charts, month pace, analytics preview grid, tooltip updates
- `frontend/src/components/coverage-tracker.tsx` — full redesign to horizontal bar timeline
- `frontend/src/app/import/page.tsx` — delete modal, coverage tracker styling
- `frontend/src/app/transactions/page.tsx` — inline filters, remove animation, add card sort
- `frontend/src/app/analytics/page.tsx` — tab descriptions, chart annotations, info popovers, empty states
- `frontend/src/app/settings/page.tsx` — CSV upload detection, required `*`, color picker portal, category dots, theme previews
- `frontend/src/components/ui/themed-dropdown.tsx` — add `dotColor` support to options
- `frontend/src/components/ui/themed-color-picker.tsx` — portal rendering, height fix
- `frontend/src/components/sidebar.tsx` — extract theme preview if shared

### Backend changes:
- Add `import_id` filter to `/transactions` query params (if not already present) — small addition to `TransactionQuery` struct and query builder

## What Was NOT Changed (and why)

- **Dashboard hero stat untouched:** It works. User didn't flag it. Don't fix what isn't broken.
- **No new analytics charts added:** The problem was comprehension, not quantity. Education > more data.
- **No redesign of analytics tab structure:** 5 tabs is fine. The issue was understanding, not organization.
- **Import drop zone unchanged:** No feedback about it. The coverage tracker and delete modal are the import fixes.
- **No backend endpoint changes beyond import_id filter:** All other data needed is already available from existing endpoints.
