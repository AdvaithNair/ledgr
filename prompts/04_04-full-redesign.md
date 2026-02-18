# Prompt 04_04: Full Frontend Redesign — Unified Theme, All Pages

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

Motion: Use animations for effects and micro-interactions. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics — predictable layouts, cookie-cutter design, overused font families. Interpret creatively and make unexpected choices that feel genuinely designed for the context.
</frontend_aesthetics>

---

## Context

The Meridian dashboard (prompt 04_03) is polished — themed, animated, distinctive. But every other page is a dark-only stub with hardcoded colors, different typography, different border radii, and no theme support. The app has a split personality. Navigating from the refined Meridian dashboard to the Import page feels like entering a different, unfinished product.

### The Problem

| Component | Meridian (Dashboard) | Everything Else |
|-----------|---------------------|-----------------|
| Theme | Arctic/Paper × Dark/Light via `useTheme()` | Dark-only, hardcoded `text-white`, `bg-surface` |
| Panels | `ThemedPanel` — glass/surface, 16px radius, blur | `Card` — 8px radius, `border-border bg-surface` |
| Typography | `displayFont` (Outfit/Fraunces) + `bodyFont` (DM Sans/Source Serif) | Default `font-sans` (Inter) everywhere |
| Numbers | `font-mono` with `tabular-nums`, theme-colored | `font-mono text-white` hardcoded |
| Headings | `ThemedLabel` — 10px uppercase tracking | `text-2xl font-semibold text-white` |
| Motion | Spring-animated hero, scroll-triggered reveals | Zero animation |
| Empty state | Themed `Skeleton` + `EmptyState` | Emoji icons, dark-only |
| Pages | Fully implemented dashboard | Stubs (Transactions, Analytics) or minimal (Import, Settings) |

### The Goal

Make every page feel like it belongs to the same product as Meridian. Extend the theme system app-wide, redesign all pages with the same level of craft, and implement the remaining stub pages.

### Aesthetic Direction: "Precision Instruments"

Each page is a different instrument in the same workshop. They share materials (glass panels, accent colors, typography pairings) but each has its own character:

- **Dashboard (Meridian)**: The main gauge — sweeping, meditative, hero-focused *(already built)*
- **Sidebar**: The tool rack — minimal, tactile, always present
- **Import**: The intake funnel — satisfying drop mechanics, confidence-building results
- **Transactions**: The ledger — dense but scannable, a proper financial table
- **Analytics**: The magnifying glass — deep visualizations, pattern discovery, "20% deep dive" home
- **Settings**: The calibration panel — clean forms, mechanical precision

---

## Prerequisites

- Prompt 04_03 completed: Meridian layout, ThemeProvider, themed-components, useDashboardData hook
- Both Arctic (glass) and Paper (editorial) themes exist with dark/light modes
- Backend API fully functional (all endpoints from prompt 03)
- All TypeScript types defined in `src/types/index.ts`
- API client with all endpoints in `src/lib/api.ts`

---

## Part 1: Theme System — Lift to Root

The most critical change. Move `ThemeProvider` from the dashboard page to the root layout so every page inherits the theme.

### Task 1.1: Update Root Layout

**File:** `frontend/src/app/layout.tsx`

Wrap the entire app in `ThemeProvider`:

```tsx
<body>
  <ThemeProvider>
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </ThemeProvider>
</body>
```

Key changes:
- `ThemeProvider` wraps everything — sidebar and main content
- Remove the `p-8` from `<main>` — each page controls its own padding (dashboard needs different padding than transactions)
- The `<html>` tag should NOT hardcode `className="dark"` — the theme handles this
- `ThemedBackground` still lives inside individual pages (not layout) since each page may want different background treatments

**Font loading:** Keep all 10 fonts loaded in the layout. Yes it's heavy, but they're Google Fonts loaded via `next/font` — only the active theme's fonts render, and the swap on theme change must be instant. Lazy loading fonts would cause FOIT on theme switch.

### Task 1.2: Update globals.css for Theme Awareness

**File:** `frontend/src/app/globals.css`

The CSS custom properties in `@theme inline` should remain as dark defaults (they're the base). But add a `[data-theme-mode="light"]` selector that overrides key properties. This enables Tailwind classes like `bg-bg`, `text-white`, `border-border` to adapt.

However — the cleaner approach (and what Meridian already does) is to **not use Tailwind color tokens for themed content at all**. All themed components read from `useTheme()` and apply colors via `style={{}}`. Tailwind classes like `bg-surface` are only used for non-themed UI (scrollbar, selection highlight). Keep this pattern.

Add one thing: a `[data-theme-mode="light"]` attribute on `<html>` that the ThemeProvider sets, purely for the scrollbar and selection styles:

```css
[data-theme-mode="light"] {
  color-scheme: light;
}
[data-theme-mode="light"]::-webkit-scrollbar-track {
  background: #F8F8F6;
}
[data-theme-mode="light"]::-webkit-scrollbar-thumb {
  background: #D1D5DB;
}
```

### Task 1.3: Update ThemeProvider

**File:** `frontend/src/components/theme-provider.tsx`

- On mount and on theme change, set `document.documentElement.dataset.themeMode = mode` (for CSS selectors)
- Fix the `return null` during hydration — instead, render children with a default theme (Arctic Dark) to avoid flash-of-nothing. Use a CSS `visibility: hidden` trick if needed to prevent FOUC, then reveal after hydration
- Export a `useThemeColors()` convenience hook that returns just the frequently-used color tokens (avoids destructuring `theme` everywhere):

```tsx
export function useThemeColors() {
  const { theme } = useTheme();
  return {
    text: theme.text,
    textMuted: theme.textMuted,
    bg: theme.bg,
    surface: theme.surface,
    border: theme.border,
    accent: theme.accent,
    danger: theme.danger,
    success: theme.success,
    displayFont: theme.displayFont,
    bodyFont: theme.bodyFont,
  };
}
```

### Task 1.4: Update Dashboard Page

**File:** `frontend/src/app/page.tsx`

Remove the `<ThemeProvider>` wrapper — it's now in the root layout. The page should just render content directly:

```tsx
export default function DashboardPage() {
  const { summary, monthly, ... } = useDashboardData();
  return (
    <div className="pt-14">
      <DesignTrialNavigator currentLayout={0} ... />
      {loading ? <DashboardSkeleton /> : ...}
    </div>
  );
}
```

Similarly update all lab layout pages (`/1` through `/5`) — remove their individual `<ThemeProvider>` wrappers.

---

## Part 2: Themed UI Primitives

Replace the existing dark-only components with theme-aware versions. These are the building blocks every page uses.

### Task 2.1: Themed Page Shell

**File:** `frontend/src/components/page-shell.tsx` *(new)*

Every non-dashboard page wraps its content in this. Provides the themed background + consistent padding + page enter animation.

```
┌──────────────────────────────────────────────────────────────┐
│  ThemedBackground                                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12       │   │
│  │                                                        │   │
│  │  [Page Header — display font, themed]                  │   │
│  │                                                        │   │
│  │  [Page Content]                                        │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

Props:
- `title: string` — page heading, rendered in `theme.displayFont`, larger than body
- `description?: string` — subtitle in `theme.bodyFont`, muted
- `action?: ReactNode` — optional right-aligned action (button, etc.)
- `maxWidth?: 'sm' | 'md' | 'lg' | 'xl'` — controls `max-w-*` (default `6xl`)
- `children: ReactNode`

The header section should have a subtle stagger animation: title fades in (0ms), description fades in (100ms), content fades in (200ms). Use Framer Motion.

### Task 2.2: Themed Form Controls

**File:** `frontend/src/components/ui/themed-input.tsx` *(new)*

Input, Select, and Textarea that read from the theme:

**ThemedInput:**
- Arctic Dark: `bg-white/[0.04]`, `border border-white/[0.08]`, `text-white`, `placeholder:text-white/30`, `focus:border-accent/50 focus:ring-1 focus:ring-accent/20`
- Arctic Light: `bg-white`, `border border-sky-200/50`, `text-slate-900`, `focus:border-sky-400`
- Paper Dark: `bg-white/[0.04]`, `border border-white/[0.08]`, `text-white`, `focus:border-emerald-400/50`
- Paper Light: `bg-white`, `border border-stone-200`, `text-stone-900`, `focus:border-emerald-500`
- All: `rounded-xl px-4 py-3 text-sm`, `font-family: theme.bodyFont`, `transition-colors duration-200`

**ThemedSelect:**
- Same styling as ThemedInput but with a custom chevron indicator (SVG, theme-colored)
- Use a `<select>` with `appearance-none` and the chevron positioned absolutely

**ThemedTextarea:**
- Same base styling, `min-h-[100px]`, `resize-y`

### Task 2.3: Themed Button

**File:** `frontend/src/components/ui/themed-button.tsx` *(new)*

Replaces the existing `button.tsx`. Reads all colors from theme.

Variants:
- **primary**: Background = `theme.accent`, text = white (or black for light accent colors). Hover: slight brightness increase. Active: slight scale-down (0.98).
- **secondary**: Background = transparent, border = `theme.border`, text = `theme.text`. Hover: `bg-white/5` (dark) or `bg-black/5` (light).
- **danger**: Background = `theme.danger` at 10% opacity, border = `theme.danger` at 20%, text = `theme.danger`. Hover: danger at 15% opacity.
- **ghost**: No border, no background. Text = `theme.textMuted`. Hover: `theme.text`.

All variants: `rounded-xl`, `font-family: theme.bodyFont`, `font-weight: 500`, `transition: all 200ms`. Three sizes (sm/md/lg). Loading state with a minimal spinner (two concentric arcs rotating, not a generic circle).

Subtle spring animation on press using Framer Motion `whileTap={{ scale: 0.97 }}`.

### Task 2.4: Themed Badge

**File:** `frontend/src/components/ui/themed-badge.tsx` *(new)*

Replaces `badge.tsx`. When given a hex `color`, uses `color-mix(in srgb, ${color} 12%, transparent)` for background and the color for text. Without a color, uses theme accent at 10% + accent text.

Outline variant: transparent bg, border in the color.

`rounded-full`, `px-2.5 py-0.5`, `text-[11px] font-medium`, `font-family: theme.bodyFont`.

### Task 2.5: Themed Skeleton

**File:** `frontend/src/components/ui/themed-skeleton.tsx` *(new)*

Replaces `skeleton.tsx`. Uses theme-aware colors:
- Dark mode: `bg-white/[0.04]` with a shimmer gradient `bg-gradient-to-r from-transparent via-white/[0.06] to-transparent` animating left-to-right
- Light mode: `bg-black/[0.04]` with `via-black/[0.06]` shimmer

The shimmer animation should be CSS-only (`@keyframes shimmer` with `background-position` animation). No JS.

Variants: `text` (h-4 rounded), `heading` (h-8 w-48 rounded-lg), `card` (h-32 rounded-2xl), `chart` (h-64 rounded-2xl), `row` (h-12 rounded-xl).

### Task 2.6: Themed Empty State

**File:** `frontend/src/components/ui/themed-empty-state.tsx` *(new)*

Replaces `empty-state.tsx`. No more emoji icons — use minimal SVG illustrations that match the theme.

```
┌──────────────────────────────────────────────┐
│                                              │
│              [SVG illustration]               │  ← thin-stroke line art, accent-colored
│                                              │
│           No transactions yet                │  ← displayFont, theme.text
│                                              │
│     Import a CSV to see your spending.       │  ← bodyFont, theme.textMuted
│                                              │
│          [ Import CSV ]                      │  ← ThemedButton primary
│         or  Use Test Data                    │  ← ThemedButton ghost
│                                              │
└──────────────────────────────────────────────┘
```

SVG illustrations (inline, not files):
- **Transactions empty**: A simple ledger/list icon with 3 horizontal lines fading out
- **Analytics empty**: A mini chart icon with an upward trend line
- **Import empty**: An upload/inbox icon with a downward arrow
- **Settings empty**: A sliders/toggles icon
- **Generic**: A folder icon

All illustrations: thin stroke (`strokeWidth="1.5"`), colored with `theme.accent` at 40% opacity, 48×48px. Subtle float animation (y: 0→-4→0, 3s loop, ease-in-out) via Framer Motion.

### Task 2.7: Update Themed Components

**File:** `frontend/src/components/dashboards/themed-components.tsx`

Add these exports to the existing file:

**ThemedTable**: A styled `<table>` wrapper for data-heavy pages:
- Header row: `text-[10px] uppercase tracking-widest`, color `theme.textMuted`, `font-family: theme.bodyFont`, no border, bottom padding
- Body rows: `border-b border-${theme.border}` (light hairline), `py-3`
- Row hover: `bg-white/[0.02]` (dark) or `bg-black/[0.02]` (light), transition
- Striped option: alternating rows get `bg-white/[0.015]` (dark) or `bg-black/[0.015]` (light)
- Cell text: `text-[13px]`, `font-family: theme.bodyFont`, `color: theme.text`
- Numeric cells: `font-mono tabular-nums text-right`

**ThemedStat**: A compact stat display (replaces `stat-card.tsx`):
- Label: `ThemedLabel` (10px uppercase)
- Value: `font-mono text-2xl font-semibold tabular-nums`, `color: theme.text`
- SubValue: `text-xs`, `color: theme.textMuted`
- Trend arrow: colored by sentiment (up=danger for spending, down=success)

---

## Part 3: Sidebar Redesign

The sidebar must adapt to the theme while maintaining its navigation purpose.

### Task 3.1: Theme-Aware Sidebar

**File:** `frontend/src/components/sidebar.tsx`

**Major changes:**
- Read from `useTheme()` for all colors — no more hardcoded `text-white`, `bg-surface`, `border-border`
- Background: `theme.surface` (inline style) instead of `bg-surface` Tailwind class
- Border: `theme.border`
- Logo "Ledgr": Use `theme.displayFont` instead of `font-mono` — this makes the wordmark feel cohesive with the current theme
- Nav item active state: replace `border-l-2 border-white` with a filled pill background (`bg-${theme.accent} at 10%`, `text-${theme.accent}`) — no layout shift from borders
- Nav item inactive: `color: theme.textMuted`, hover → `color: theme.text`
- Collapse toggle: themed hover state

**Remove the Lab section entirely from the sidebar.** The lab routes (`/1`–`/5`) are accessible via the Design Trial Navigator on the dashboard page. They don't belong in the primary navigation — they confuse the product experience.

**Bottom section:** Replace "Local only" text with a more useful element:
- Show the current theme name: "Arctic" or "Paper" with a small dot in the accent color
- Click to cycle through themes (arctic-dark → arctic-light → paper-dark → paper-light → arctic-dark)
- This replaces the navigator's style/mode toggles for non-dashboard pages

**Sidebar structure:**

```
┌──────────────────────┐
│  Ledgr               │  ← displayFont, bold, theme.text
│                       │
│  ● Dashboard          │  ← nav items with accent-colored active pill
│    Import             │
│    Transactions       │
│    Analytics          │
│                       │
│  ─────────────        │  ← divider in theme.border
│                       │
│    Settings           │  ← separated, lower priority
│                       │
│                       │
│                       │
│  ● Arctic Dark   ↻   │  ← theme indicator + cycle button
└──────────────────────┘
```

**Collapsed state:** Icon-only, theme dot at bottom (no text). The theme cycle button becomes just the `↻` icon.

**Animation:** Collapse/expand transition remains Framer Motion width animation. Add a subtle opacity fade on text labels during collapse (opacity 1→0 over 150ms, then display none).

---

## Part 4: Import Page Redesign

The import page is the user's entry point for data. It must feel satisfying and confidence-building.

### Task 4.1: Import Page

**File:** `frontend/src/app/import/page.tsx`

Uses `PageShell` wrapper. Full implementation with theme support.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  PageShell: "Import" / "Drop a CSV to add transactions"      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │           ┌──────────────────────┐                     │  │
│  │           │      ↓               │                     │  │
│  │           │  Drop CSV here       │                     │  │
│  │           │  or click to browse  │                     │  │
│  │           └──────────────────────┘                     │  │
│  │                                                        │  │
│  │    Card: [ Auto-detect        ▾ ]    [ Import ]        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Result (appears after import) ────────────────────────┐  │
│  │                                                        │  │
│  │   142 parsed  ·  138 new  ·  4 duplicates  ·  0 skip  │  │
│  │                                                        │  │
│  │   ✓ Successfully imported to Amex Gold                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  IMPORT HISTORY                                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Filename          Card           Date       Txns  Dups │  │
│  │ amex-feb.csv      ● Amex Gold    Feb 18     142   4   │  │
│  │ citi-jan.csv      ● Citi Costco  Jan 15     89    2   │  │
│  │ cap1-jan.csv      ● Capital One  Jan 12     67    0   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Drop Zone Design:**

Inside a `ThemedPanel`. The drop zone itself is a dashed-border rectangle:
- Default: `border-2 border-dashed`, color = `theme.border`, `rounded-2xl`, `py-16` for height
- Drag hover: border becomes `theme.accent`, background gets a subtle `theme.accent` at 3% opacity, border style becomes solid. Scale up slightly (1.01) with spring animation.
- Center icon: thin-stroke upload arrow SVG, 32×32, `color: theme.textMuted`. On drag hover, arrow bounces up with spring animation.
- Text: "Drop CSV here" in `theme.bodyFont`, "or click to browse" smaller and muted
- File input is the standard hidden `<input type="file" accept=".csv">` trick

**File Selected State:**

Replace the drop zone content (not the panel) with:
- File icon + filename + size in KB
- "Remove" ghost button
- Everything in a horizontal row

**Card Selector + Import Button:**

Below the drop zone, inside the same panel:
- `ThemedSelect` for card selection. Options: "Auto-detect" (default) + all cards from API (fetched on mount). Each card option shows its color dot if possible.
- `ThemedButton primary` for "Import". Disabled until file is selected. Loading state during upload.

**Result Card (conditional — appears after successful import):**

A `ThemedPanel` with `theme.success` left accent stripe (same pattern as Meridian's alert):
- Four stats in a row: parsed, new, duplicates, skipped — each in `font-mono`, with `ThemedLabel` above
- Success message below: "Successfully imported to {card_label}" with a check icon

**Error Card (conditional):**

Same pattern but with `theme.danger` accent stripe and red-tinted background.

**Import History:**

`ThemedLabel` heading "Import History", then a `ThemedTable` with columns:
- Filename (body font, truncated)
- Card (colored dot + label)
- Date (formatted with `formatDate`)
- Transactions (`font-mono`)
- Duplicates (`font-mono`)

Data: `getImportHistory()` on mount. If empty, show a muted "No imports yet" message — not a full EmptyState.

**Animation:**
- Drop zone: Framer Motion `layoutId` for smooth transition between empty→file-selected→result states
- Result card: slides up from below with spring animation after successful import
- History rows: staggered fade-in on mount (50ms per row)

---

## Part 5: Transactions Page

The most data-heavy page. Must handle hundreds or thousands of rows while remaining scannable.

### Task 5.1: Transactions Page

**File:** `frontend/src/app/transactions/page.tsx`

Uses `PageShell` with `maxWidth="xl"` for wider content.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  PageShell: "Transactions" / "All your spending in one place"        │
│                                                                      │
│  ┌─ Filters ──────────────────────────────────────────────────────┐  │
│  │  🔍 Search...          Card: [All ▾]  Category: [All ▾]       │  │
│  │                        Date: [This month ▾]  Sort: [Date ▾]   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Table ────────────────────────────────────────────────────────┐  │
│  │  DATE        DESCRIPTION              CATEGORY    CARD   AMOUNT│  │
│  │  Feb 18      CHICK-FIL-A #1234        Dining      ● AX  $12.50│  │
│  │  Feb 17      WHOLE FOODS MARKET       Groceries   ● CI  $87.32│  │
│  │  Feb 17      AMAZON.COM*RT3K2         Shopping    ● AX  $34.99│  │
│  │  Feb 16      SHELL OIL 0342           Gas         ● C1  $45.00│  │
│  │  Feb 15      SPOTIFY USA              Subs        ● AX  $10.99│  │
│  │  ...                                                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Pagination ───────────────────────────────────────────────────┐  │
│  │  ← Prev    Page 1 of 12    Next →     Showing 1–50 of 589     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Filter Bar:**

A `ThemedPanel` with a horizontal layout:
- **Search**: `ThemedInput` with a search icon (magnifying glass SVG, `theme.textMuted`). Debounced 300ms. Searches `description` field.
- **Card filter**: `ThemedSelect` with options "All Cards" + each card. Active filter shows the card's color dot.
- **Category filter**: `ThemedSelect` with options "All Categories" + CATEGORIES list.
- **Date range**: `ThemedSelect` with presets: "This month", "Last month", "Last 3 months", "Last 6 months", "This year", "All time". Default: "This month".
- **Sort**: `ThemedSelect` with options: "Date (newest)", "Date (oldest)", "Amount (high→low)", "Amount (low→high)".

On mobile (<768px): filters stack into a 2×2 grid. Search stays full-width above.

**Transaction Table:**

Use `ThemedTable`. Columns:

| Column | Width | Style |
|--------|-------|-------|
| Date | 80px | `text-[12px] font-mono tabular-nums`, muted. Format: "Feb 18" (month + day) |
| Description | flex-1 | `text-[13px]`, body font, truncated. This is the merchant/description from the CSV |
| Category | 100px | `ThemedBadge` with category color from `CATEGORY_COLORS`. Clickable — opens inline edit |
| Card | 60px | Small colored dot + 2-letter abbreviation (e.g., "AX", "CI", "C1"). Tooltip shows full card name |
| Amount | 80px | `font-mono text-[13px] tabular-nums text-right font-medium`, `theme.text` |

**Category Inline Edit:**

When the user clicks a category badge, it transforms into a `ThemedSelect` dropdown with all categories. On selection, calls `updateCategory(id, newCategory)` API. On blur or Escape, reverts.

This is the primary way users fix miscategorized transactions. Make it feel snappy — the badge morphs into a select with a spring animation, and snaps back on save.

**Pagination:**

Below the table, a simple row:
- "← Prev" and "Next →" as `ThemedButton ghost`. Disabled at boundaries.
- "Page X of Y" in body font, muted
- "Showing N–M of Total" in `font-mono text-xs`, muted

Use `getTransactions({ page, per_page: 50, card, category, search, start_date, end_date, sort_by, sort_dir })` — build query params from filter state.

**Empty State:**

If no transactions at all (not filtered — truly empty), show `ThemedEmptyState` with import CTA. If filtered to zero results, show a lighter message: "No transactions match your filters" with a "Clear filters" ghost button.

**Animation:**
- Table rows: staggered fade-in on data load (30ms per row, max 15 rows visible)
- Page transitions: content fades out (100ms) and fades back in (200ms) on page/filter change
- Category edit: spring morph badge → select → badge

---

## Part 6: Analytics Page

This is the "20% deep dive" home from PRODUCT.md. The dashboard shows surface insights; Analytics goes deep.

### Task 6.1: Analytics Page

**File:** `frontend/src/app/analytics/page.tsx`

Uses `PageShell` with `maxWidth="xl"`.

This page fetches its own data independently (not `useDashboardData` — it has different needs):
- `getPatterns()` — day-of-week and day-of-month patterns
- `getHabits()` — impulse spending, category creep, weekend splurge, subscription bloat, merchant concentration
- `getRecurring()` — subscription details
- `getForecast()` — projections and category forecasts
- `getMonthly()` — monthly trends by card and category
- `getDaily()` — daily spending for heatmap

Organize into sections with a tab-like selector at the top, implemented as themed pill buttons (not browser tabs — pills in a row, like the Meridian context gauge style):

```
  [ Habits ]  [ Patterns ]  [ Subscriptions ]  [ Forecast ]
```

Active pill: `theme.accent` at 15% bg + accent text. Inactive: `theme.textMuted`.

Each tab is a scrollable section, not a route — state is local.

#### Tab: Habits

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─ Impulse Spending ─────────────────────────────────────┐  │
│  │  Score: 3/10 (Low)                                     │  │
│  │                                                        │  │
│  │  "XX% of your transactions are under $15,              │  │
│  │   totaling $XXX/month."                                │  │
│  │                                                        │  │
│  │  ████████░░░░░░░░░░░░░░  3/10                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Weekend Splurge ──────────────────────────────────────┐  │
│  │  Weekday avg: $XX/day  ·  Weekend avg: $XX/day         │  │
│  │                                                        │  │
│  │  [Bar chart: 7 bars, Mon-Sun, weekend bars highlighted │  │
│  │   in accent color]                                     │  │
│  │                                                        │  │
│  │  "Your weekends cost XX% more than weekdays."          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Category Creep ───────────────────────────────────────┐  │
│  │  Categories trending up over 3 months:                 │  │
│  │                                                        │  │
│  │  Dining      ▲ +23%   $450 → $520 → $680              │  │
│  │  Transport   ▲ +15%   $80 → $90 → $105                │  │
│  │                                                        │  │
│  │  Categories trending down:                             │  │
│  │  Shopping    ▼ -12%   $500 → $460 → $420               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Merchant Concentration ───────────────────────────────┐  │
│  │  Top merchant: XX (XX% of spending)                    │  │
│  │  Top 3: XX% of total                                   │  │
│  │                                                        │  │
│  │  [Horizontal bar chart: top 5 merchants as proportion] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each habit section is a `ThemedPanel`. The habit score uses a `ProportionBar` (reuse from Meridian). The message text is displayed in the pull-quote style from Meridian — `bodyFont`, slightly larger, relaxed line-height.

The weekend splurge section includes a **day-of-week bar chart** using Recharts `<BarChart>`:
- 7 bars (Mon–Sun)
- Weekend bars (Sat, Sun) colored with `theme.accent`
- Weekday bars colored with `theme.textMuted` at 30% opacity
- Y-axis: dollar amounts
- No grid lines — clean, minimal

Category creep shows mini inline sparklines (3 data points) next to each category trend. Use Recharts `<LineChart>` at tiny size (80×20px) with no axes, just the line.

#### Tab: Patterns

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─ Spending by Day of Week ──────────────────────────────┐  │
│  │  [Bar chart: Mon-Sun, full width, 200px tall]          │  │
│  │  Highest: Saturday ($XX avg)                           │  │
│  │  Lowest: Tuesday ($XX avg)                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Spending by Day of Month ─────────────────────────────┐  │
│  │  [Area chart: days 1-31, shows spending distribution]  │  │
│  │  Peak: 1st–3rd (rent/bills?) and 15th                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ 90-Day Heatmap ──────────────────────────────────────┐  │
│  │  [Calendar heatmap grid, 7 rows × 13 cols]            │  │
│  │  Color scale: theme.surface → theme.accent             │  │
│  │  Hover shows date + amount                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**90-Day Heatmap**: Custom component (not Recharts). Grid of small squares:
- 7 rows (days of week) × ~13 columns (weeks)
- Color interpolation: 0 spending = `theme.surface`, max spending = `theme.accent`
- Use CSS `background-color` with `color-mix` for intermediate values
- Hover: square gets a ring in `theme.accent`, tooltip shows date + amount
- Month labels above each month boundary
- Day labels (M, W, F) on the left

#### Tab: Subscriptions

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─ Summary ──────────────────────────────────────────────┐  │
│  │  $XXX/month  ·  $X,XXX/year  ·  XX active             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Active ───────────────────────────────────────────────┐  │
│  │  Merchant        Frequency    Amount     Annual        │  │
│  │  Netflix         Monthly      $16.00     $192.00       │  │
│  │  Spotify         Monthly      $10.99     $131.88       │  │
│  │  Planet Fitness  Monthly      $49.99     $599.88       │  │
│  │  ...                                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Possibly Forgotten ──────────────────────────────────┐  │  ← conditional, accent stripe
│  │  ▌ Headspace — last charged 47 days ago ($14.99)      │  │
│  │  ▌ Audible — last charged 62 days ago ($15.95)        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Active subscriptions in a `ThemedTable`. Forgotten subscriptions in a danger-tinted alert panel (same style as Meridian alert).

#### Tab: Forecast

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─ Month Projection ─────────────────────────────────────┐  │
│  │                                                        │  │
│  │  Projected:  $X,XXX                                    │  │  ← displayFont, large
│  │  Average:    $X,XXX                                    │  │
│  │  Difference: +$XXX (X% above average)                  │  │
│  │                                                        │  │
│  │  [Progress bar: spent_so_far / projected]              │  │
│  │  XX days elapsed  ·  XX days remaining                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Category Forecasts ───────────────────────────────────┐  │
│  │  Category    Spent    Projected   vs Avg    Trend       │  │
│  │  Dining      $450     $680        ▲ +45%   up          │  │
│  │  Groceries   $380     $520        ▲ +12%   up          │  │
│  │  Shopping    $290     $420        ▼ -8%    down        │  │
│  │  Gas         $120     $180        ─ flat   stable      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Projection Methods ──────────────────────────────────┐  │
│  │  Linear: $X,XXX  ·  Weighted: $X,XXX  ·  EWMA: $X,XXX│  │
│  │  Using: Recommended ($X,XXX)                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The projection section uses `ThemedStat` for the big numbers. Category forecasts use `ThemedTable` with trend arrows colored by sentiment. Projection methods shown as a compact info row at the bottom.

---

## Part 7: Settings Page

Clean, functional. The calibration panel.

### Task 7.1: Settings Page

**File:** `frontend/src/app/settings/page.tsx`

Uses `PageShell` with `maxWidth="md"` (narrower — settings don't need width).

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  PageShell: "Settings" / "Manage your preferences"           │
│                                                              │
│  ┌─ Your Name ────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  Used to filter out other authorized users on your     │  │
│  │  credit cards. Enter your name as it appears on        │  │
│  │  statements.                                           │  │
│  │                                                        │  │
│  │  [ Your name                        ]   [ Save ]       │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Cards ────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  ● Amex Gold           amex         [ Edit ] [ ✕ ]     │  │
│  │  ● Citi Costco         citi         [ Edit ] [ ✕ ]     │  │
│  │  ● Capital One         capitalone   [ Edit ] [ ✕ ]     │  │
│  │                                                        │  │
│  │  [ + Add Card ]                                        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Data ─────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  Total transactions: 589                               │  │
│  │  Data range: Jan 2025 – Feb 2026                       │  │
│  │  Database size: ~2.4 MB                                │  │
│  │                                                        │  │
│  │  [ Delete All Transactions ]   ← danger button         │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Theme ────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  Style: [ Arctic ● ] [ Paper   ]                       │  │
│  │  Mode:  [ Dark   ● ] [ Light   ]                       │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Your Name Section:**

- `ThemedPanel` with `ThemedLabel` heading
- Explanation text in `theme.textMuted`, `bodyFont`
- `ThemedInput` + `ThemedButton primary` "Save" in a row
- On mount, fetch `getConfig()` and populate the input
- On save, call `updateConfig({ user_name: value })`, show success feedback (input border flashes `theme.success` briefly)

**Cards Section:**

- `ThemedPanel` with `ThemedLabel` heading
- Each card: row with colored dot, label, code (muted), Edit + Delete buttons
- **Edit**: Clicking "Edit" expands the row into an inline form with fields for label, code, color (color picker or hex input), and CSV column mappings. Save calls `updateCard()`.
- **Delete**: `ThemedButton danger` (small). Confirmation: the button transforms to "Are you sure?" text with confirm/cancel for 3 seconds, then reverts. Calls `deleteCard()`.
- **Add Card**: `ThemedButton secondary`. Opens the same inline form below the list, but for creating (`createCard()`).

Keep the card form minimal — most users will only configure cards once. Fields:
- Label (required): "Amex Gold"
- Code (required): "amex" — auto-generated from label (lowercase, spaces removed) but editable
- Color (required): hex color picker (a simple text input with a small color swatch preview is fine — no need for a full color picker library)
- Header pattern: comma-separated keywords for auto-detection (optional, advanced)
- CSV column mappings: date, description, amount, category, member columns (optional, collapsible "Advanced" section)

**Data Section:**

- `ThemedPanel` with stats from the summary endpoint or computed from import history
- `ThemedButton danger` for "Delete All Transactions" — same 3-second confirmation pattern
- On delete, call `deleteAllTransactions()`, refresh data

**Theme Section:**

- `ThemedPanel` with two toggle groups
- Style toggle: two pill buttons, "Arctic" and "Paper" — active one filled with accent
- Mode toggle: two pill buttons, "Dark" and "Light"
- These mirror what's in the sidebar theme cycler but give explicit control
- Changes apply immediately via `setStyle()` and `setMode()`

---

## Part 8: Design Trial Navigator Update

### Task 8.1: Navigator Scope

**File:** `frontend/src/components/dashboards/design-trial-navigator.tsx`

The navigator should **only render on the dashboard page and lab routes** (`/`, `/1`–`/5`). Other pages have their own headers and don't need the layout switcher.

Remove the style/mode toggles from the navigator — these are now in the sidebar (theme cycler) and settings page. The navigator becomes purely a layout selector:

```
   [ Meridian ]  [ 1. Zen Flow ]  [ 2. Command Deck ]  ...   [ Test Data ]
```

Keep the Test Data toggle on the navigator since it's dashboard-specific.

---

## Part 9: Cleanup

### Task 9.1: Remove Unused Components

Delete these files (they're replaced by themed versions):
- `frontend/src/components/ui/card.tsx` → replaced by `ThemedPanel`
- `frontend/src/components/ui/button.tsx` → replaced by `themed-button.tsx`
- `frontend/src/components/ui/badge.tsx` → replaced by `themed-badge.tsx`
- `frontend/src/components/ui/skeleton.tsx` → replaced by `themed-skeleton.tsx`
- `frontend/src/components/ui/empty-state.tsx` → replaced by `themed-empty-state.tsx`
- `frontend/src/components/ui/stat-card.tsx` → replaced by `ThemedStat` in themed-components
- `frontend/src/components/page-header.tsx` → replaced by `page-shell.tsx`

Update all imports across the codebase to use the new components. The lab layouts (`/1`–`/5`) may still reference old components — update their imports too, or leave them as-is since they're experimental (preference: update imports so they don't break).

### Task 9.2: Remove Dark-Only Coverage Tracker

**File:** `frontend/src/components/coverage-tracker.tsx`

This component hardcodes a January 2025 start date and uses dark-only colors. Either:
- **Option A:** Rewrite to be theme-aware and derive the date range from actual data (preferred)
- **Option B:** Remove it entirely if it's not used anywhere

If keeping it, integrate it into the Import page (below the drop zone, above history) — it answers "which months have I imported?"

### Task 9.3: Update DashboardLayoutProps

**File:** `frontend/src/components/dashboards/layouts/zen-flow.tsx` (where the interface is defined)

The `DashboardLayoutProps` interface should be moved to `frontend/src/types/index.ts` since it's shared across all layouts and the dashboard page. Add it as an export alongside the other types.

---

## Cross-Cutting Concerns

### Typography Rules (enforced everywhere)

| Context | Font | Example |
|---------|------|---------|
| Page titles, section headings, hero numbers | `theme.displayFont` | "Transactions", "$2,345.67" |
| Body text, descriptions, labels | `theme.bodyFont` | "Drop a CSV to add transactions" |
| Financial numbers (non-hero) | `font-mono` + `tabular-nums` | "$12.50", "142 parsed" |
| UI labels (section headers, column headers) | `theme.bodyFont`, 10px uppercase tracking-widest | "IMPORT HISTORY", "DATE" |
| Code/technical strings | `font-mono` | Card codes like "amex", file names |

### Spacing System

Use a consistent spacing scale derived from the theme:
- Section gaps: `space-y-6` (24px)
- Panel internal padding: `p-5` (20px) or `p-6` (24px)
- Between-panel gaps: `gap-4` (16px)
- Text rhythm: `space-y-2` (8px) within panels

### Animation Vocabulary

All pages should share the same motion language as Meridian:

| Motion | Usage | Spec |
|--------|-------|------|
| Section reveal | Every panel on scroll | `opacity: 0, y: 20 → 1, 0`, `0.5s`, ease `[0.22, 1, 0.36, 1]`, `whileInView once` |
| Button press | All buttons | `whileTap={{ scale: 0.97 }}` |
| Stagger rows | Table rows, list items | `30-50ms` delay per item |
| State change | Filters, tabs, toggles | `200ms ease-out` transition |
| Success flash | After save/import | Border flashes `theme.success`, fades over `1s` |
| Spring morph | Inline edits, expanding forms | `type: "spring", stiffness: 300, damping: 25` |

Use the same `sectionReveal` pattern from Meridian (can extract to a shared utility).

### Theme Compatibility Checklist

Every component must work in all 4 theme combinations. Quick test for each:

1. **Arctic Dark** — glass panels, sky-blue accents, Outfit headings
2. **Arctic Light** — frosted white panels, sky-blue accents, Outfit headings
3. **Paper Dark** — warm charcoal panels, emerald accents, Fraunces italic headings
4. **Paper Light** — white/cream panels, emerald accents, Fraunces italic headings

No hardcoded colors allowed outside of globals.css base tokens. All component colors must come from `useTheme()`.

---

## File Structure After This Prompt

```
frontend/src/
├── app/
│   ├── layout.tsx              # Updated: ThemeProvider wraps everything
│   ├── globals.css             # Updated: light mode scrollbar styles
│   ├── page.tsx                # Updated: no ThemeProvider wrapper
│   ├── 1/page.tsx              # Updated: no ThemeProvider wrapper
│   ├── 2/page.tsx              # (same update)
│   ├── 3/page.tsx              # (same update)
│   ├── 4/page.tsx              # (same update)
│   ├── 5/page.tsx              # (same update)
│   ├── import/page.tsx         # REWRITTEN: full themed import page
│   ├── transactions/page.tsx   # REWRITTEN: full transaction browser
│   ├── analytics/page.tsx      # REWRITTEN: tabbed analytics deep-dive
│   └── settings/page.tsx       # REWRITTEN: config, cards, data, theme
├── components/
│   ├── sidebar.tsx             # REWRITTEN: theme-aware, no lab section
│   ├── page-shell.tsx          # NEW: themed page wrapper
│   ├── theme-provider.tsx      # UPDATED: data attribute, no null render
│   ├── dashboards/
│   │   ├── themed-components.tsx    # UPDATED: +ThemedTable, +ThemedStat
│   │   ├── design-trial-navigator.tsx  # UPDATED: no style/mode toggles
│   │   └── layouts/
│   │       ├── meridian.tsx         # Unchanged (already themed)
│   │       ├── zen-flow.tsx         # Updated imports
│   │       ├── command-deck.tsx     # Updated imports
│   │       ├── daily-journal.tsx    # Updated imports
│   │       ├── mosaic.tsx           # Updated imports
│   │       └── pulse.tsx            # Updated imports
│   └── ui/
│       ├── themed-input.tsx         # NEW: input, select, textarea
│       ├── themed-button.tsx        # NEW: replaces button.tsx
│       ├── themed-badge.tsx         # NEW: replaces badge.tsx
│       ├── themed-skeleton.tsx      # NEW: replaces skeleton.tsx
│       └── themed-empty-state.tsx   # NEW: replaces empty-state.tsx
├── hooks/
│   └── use-dashboard-data.ts       # Unchanged
├── lib/
│   ├── api.ts                      # Unchanged
│   ├── constants.ts                # Unchanged
│   └── utils.ts                    # Unchanged
└── types/
    └── index.ts                    # UPDATED: +DashboardLayoutProps export
```

**Deleted files:**
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/components/ui/empty-state.tsx`
- `frontend/src/components/ui/stat-card.tsx`
- `frontend/src/components/page-header.tsx`

---

## Verification

### Build
1. `bun dev` — compiles without errors
2. `npx tsc --noEmit` — no TypeScript errors

### Theme System
3. Theme persists in localStorage across page navigation and refresh
4. Switching theme in sidebar cycles through all 4 combos correctly
5. All pages adapt to theme changes immediately (no page reload needed)
6. No flash-of-nothing on first load (ThemeProvider renders with defaults)
7. Light mode scrollbar styles apply when in light mode

### Sidebar
8. Sidebar shows themed colors (not hardcoded dark)
9. Active nav item uses accent-colored pill (no layout shift)
10. Sidebar collapse/expand works smoothly
11. Lab section is gone from sidebar
12. Theme cycler at bottom works and shows current theme name
13. Logo uses display font from current theme

### Dashboard
14. Meridian renders at `/` without `ThemeProvider` wrapper (uses root provider)
15. Design Trial Navigator shows on dashboard, NOT on other pages
16. Lab layouts (`/1`–`/5`) still work

### Import Page
17. Drop zone renders with themed colors
18. Drag hover shows accent border + background tint
19. File selection works (click to browse, drag and drop)
20. Card selector populated from API
21. Import button fires API call, shows loading state
22. Success result appears with green accent stripe and stats
23. Error result appears with red accent stripe and message
24. Import history table loads and displays with themed styles
25. All elements adapt to all 4 theme combos

### Transactions Page
26. Transaction table loads with paginated data
27. Search filters transactions by description (debounced)
28. Card filter works
29. Category filter works
30. Date range filter works
31. Sort works (date asc/desc, amount asc/desc)
32. Pagination works (prev/next, page indicator updates)
33. Category inline edit: click badge → select → save → badge updates
34. Empty state shows when no transactions exist
35. Filtered-empty state shows "No transactions match" with clear button

### Analytics Page
36. Tab switching works (Habits, Patterns, Subscriptions, Forecast)
37. Habits tab: impulse score, weekend chart, category creep, merchant concentration all render
38. Patterns tab: day-of-week bars, day-of-month area chart, 90-day heatmap all render
39. Subscriptions tab: summary stats, active table, forgotten alert all render
40. Forecast tab: projection stats, category table, methods row all render
41. All charts use themed colors (gradient, stroke, axis, tooltip)
42. Heatmap hover tooltip shows date + amount

### Settings Page
43. User name loads from API, saves successfully
44. Cards list loads from API with correct colors
45. Edit card: inline form opens, saves changes
46. Delete card: confirmation pattern works, deletes
47. Add card: form opens, creates new card
48. Delete all transactions: confirmation pattern works, deletes
49. Theme section toggles match sidebar behavior

### Cross-cutting
50. No hardcoded `text-white`, `bg-surface`, or `border-border` in any component (except globals.css)
51. All financial numbers use `font-mono tabular-nums`
52. All section headings use display font
53. All panels use `ThemedPanel` (not `Card`)
54. All buttons use `ThemedButton` (not `Button`)
55. Stagger animations on table rows and list items
56. Section reveal animations on scroll for all pages
57. No emoji icons anywhere (replaced with SVG)
