# Prompt 04_03: Meridian — The Definitive Dashboard Layout

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
- Dashboard layouts that look like every Tailwind template on the internet

Interpret creatively and make unexpected choices that feel genuinely designed for the context.
</frontend_aesthetics>

---

## Context

We built 5 experimental dashboard layouts (Zen Flow, Command Deck, Daily Journal, Mosaic, Pulse) to explore different approaches to presenting financial data. Each revealed strengths:

| Layout | What works | What doesn't |
|--------|-----------|--------------|
| **Zen Flow** | Hero stat is huge and unmissable. Spring animation creates focus. Scroll indicator for progressive disclosure. Breathing room feels premium. | Below the fold is hollow — no categories, no merchants, no cards. Quick check is perfect but deep dive is empty. |
| **Command Deck** | 7-day velocity mini chart. Dense grid covers everything. Category horizontal bars communicate magnitude. | Overwhelming for the 80% case (quick check). Grid splits attention. Feels like a Bloomberg terminal, not a personal tool. |
| **Daily Journal** | Dynamic headline based on trajectory. Prose humanizes the data. "Your patterns" section with behavioral insights. Merchant cards (name + visits + amount) tell a story. | User doesn't open a finance dashboard to read prose *first*. Narrative gates the hero stat. Quick check is slow. |
| **Mosaic** | Trajectory progress bar is intuitive. Donut chart with legend is clean. 12-col grid allows creative tile sizing. Triangle direction indicators (▲/▼) are scannable. | Asymmetric tiles feel busy for a personal tool. Too many things competing for attention at once. |
| **Pulse** | Three mini pills (vs last, vs avg, projected) are brilliant — compact, color-coded, zero parsing. Alert card with severity bar is clear. Categories with trend arrows are forward-looking. Card stack is clean. | Hero is undersized (5xl). Lacks the breathing room that makes Zen Flow feel premium. |

### The Product Context

From `PRODUCT.md`:

- **80% of visits** are quick checks: "How much have I spent this month?" → see the hero number, maybe the trend, close. Under 10 seconds.
- **20% of visits** are deep dives: usually after importing a CSV. Browse categories, check merchants, look at trends. 5–15 minutes.
- **Information hierarchy:** Total spent → trend direction → category breakdown → card split → top merchants → insights → patterns.
- The dashboard must **nail the quick check**. The deep dive should **reward scrolling**, not overwhelm.

---

## Goal

Create **Layout 6: Meridian** — the final dashboard that combines the best components from all 5 layouts into a single, product-justified design. This replaces the 5 experimental layouts as the **production dashboard** at route `/`.

**Meridian** means the highest point, the peak — where all the explorations converge.

### Design Philosophy

Single-column, vertically flowing. Starts with Zen Flow's meditative hero moment, enriches it with Pulse's scannable context pills, opens into a clean trend chart, then progressively reveals categories, cards, merchants, and insights — each section earning its screen space.

**The rule:** Every component must trace back to a ranked user goal from PRODUCT.md. If it doesn't serve a goal, it's cut.

---

## Prerequisites

- Prompt 04_02 completed: Theme provider, themed components, `useDashboardData()` hook, all types exist
- Both Arctic Glass and Paper Light styles work
- Navigator component exists

---

## Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                     February 2026                            │  ← month label, small, muted
│                                                              │
│                    $2,345.67                                  │  ← HERO: 6xl, display font, spring animated
│                                                              │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐              │  ← context pills, centered row
│       │ vs last  │  │ vs avg   │  │ on pace  │              │
│       │ ▲ +12%   │  │ ▼ -6%   │  │ $2,480   │              │
│       └──────────┘  └──────────┘  └──────────┘              │
│                                                              │
│                       ─ · ─                                  │  ← subtle scroll indicator
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │         [12-month trend area chart]                    │  │  ← full width, 280px, Y-axis visible
│  │         with 3-month rolling average dashed overlay    │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │  CATEGORIES              │  │  CARDS                    │  │  ← side-by-side, equal width
│  │                          │  │                           │  │
│  │  Dining     $680  ▲ 45% │  │  ● Amex Gold    $1,200   │  │
│  │  ██████████████████████  │  │  ████████████████████     │  │  ← mini proportion bars
│  │                          │  │                           │  │
│  │  Groceries  $520  ▲ 12% │  │  ● Citi Costco  $800     │  │
│  │  ██████████████          │  │  ████████████            │  │
│  │                          │  │                           │  │
│  │  Shopping   $420  ▼ 8%  │  │  ● Capital One  $345     │  │
│  │  ████████████            │  │  ████████                │  │
│  │                          │  │                           │  │
│  │  Gas        $180  ─     │  │                           │  │
│  │  ██████                  │  │                           │  │
│  │                          │  │                           │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TOP MERCHANTS                                         │  │
│  │                                                        │  │
│  │  ┌──────────────────┐ ┌──────────────────┐             │  │  ← 3-col grid of merchant cards
│  │  │ Chick-fil-A      │ │ Chipotle         │             │  │
│  │  │ 8 visits · $78   │ │ 5 visits · $63   │             │  │
│  │  │ ● Amex Gold      │ │ ● Citi Costco    │             │  │  ← card color dot + card name
│  │  └──────────────────┘ └──────────────────┘             │  │
│  │  ┌──────────────────┐ ┌──────────────────┐             │  │
│  │  │ Starbucks        │ │ Amazon           │             │  │
│  │  │ 12 visits · $54  │ │ 3 visits · $120  │             │  │
│  │  │ ● Capital One    │ │ ● Amex Gold      │             │  │
│  │  └──────────────────┘ └──────────────────┘             │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │  ← conditional: only if anomalies exist
│  │  ▌                                                     │  │  ← left border colored by severity
│  │  ▌  Dining is running 45% above your average this      │  │
│  │  ▌  month. At this pace, you'll hit $890 by end        │  │
│  │  ▌  of February — $220 more than typical.              │  │  ← one paragraph, narrative voice
│  │  ▌                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │  ← conditional: only if recurring data exists
│  │  SUBSCRIPTIONS  ·  $450/mo  ·  8 active                │  │
│  │                                                        │  │
│  │  Netflix $16 · Spotify $11 · Gym $50 · iCloud $3       │  │  ← inline, compact, no grid
│  │  YouTube $14 · Apple $1 · +2 more                      │  │
│  │                                                        │  │
│  │  ⚠ 1 possibly forgotten (Headspace · 47 days ago)     │  │  ← conditional warning
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │  ← conditional: only if insights exist
│  │                                                        │  │
│  │  "Your weekend spending is 85% higher than weekdays.   │  │  ← pull-quote style, display font
│  │   Saturday is your most expensive day at $89 average." │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Section-by-Section Specification

### Section 1: Hero Moment (above the fold)

**Sources:** Zen Flow (hero size, centering, spring animation) + Pulse (context pills)

**What the user sees first:** The total spent this month — and nothing else competing with it.

```
        February 2026                    ← ThemedLabel, xs, uppercase, tracking-widest

        $2,345.67                        ← 6xl (mobile: 5xl), display font, spring animated
                                            count-up from 0 on mount (stiffness: 80, damping: 15)

   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ vs last  │  │ vs avg   │  │ on pace  │   ← pills: rounded-full, inline-flex, gap-3
   │ ▲ +12%   │  │ ▼ -6%   │  │ $2,480   │      staggered pop-in (scale 0.9→1, delay 0.3/0.4/0.5s)
   └──────────┘  └──────────┘  └──────────┘      color-coded: danger if overspending, success if under
```

**Layout:** `max-w-4xl mx-auto`, centered text, `py-20` top padding to give the hero room to breathe.

**Month label:** Current month and year from `summary` data. Small, muted, uppercase with wide tracking. Anchors the hero in time.

**Hero number:** `summary.this_month`, formatted as `$X,XXX.XX`. Uses the theme's `displayFont` (Outfit for Arctic, Fraunces for Paper). This is the ONE place that doesn't use `font-mono` — the display font gives it personality.

**Context pills:** Three compact pills in a centered row below the hero:
1. **vs last month:** `summary.mom_change_pct` — shows `▲ +12%` or `▼ -6%`. Color: `danger` if positive (spending up), `success` if negative (spending down).
2. **vs average:** `summary.vs_avg_pct` — same treatment. Compares to rolling average.
3. **on pace for:** `forecast.projected` — formatted as dollar amount. Shows where this month is heading. Color: `danger` if above average, `success` if below.

**Pill styling:**
- Arctic: `bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5`
- Paper: `bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5`
- Text: `font-mono text-xs` for the number, `text-[10px] uppercase tracking-wider` for the label above
- Arrow indicators (▲/▼) colored by sentiment, number colored by sentiment, label always muted

**Scroll indicator:** A minimal centered element below the pills — a small dot or short horizontal line (`w-8 h-px`) with a subtle breathing animation (opacity 0.3↔0.6, 3s ease loop). Not a chevron, not text. Just a whisper that there's more below.

**Justification:** User goal #1 ("Where did my money go?") is answered by the hero. Goals #2 ("Am I spending more than usual?") is answered by the pills without scrolling. This covers 80% of visits in under 3 seconds.

### Section 2: Trend Chart

**Source:** All layouts use an area chart, but Mosaic and Command Deck show Y-axis labels which matter for comparison.

**Trigger:** First scroll destination. Appears below the fold with a viewport-triggered fade-in.

```
  ┌──────────────────────────────────────────────────────┐
  │  $3k ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
  │                                                      │
  │  $2k ─ ─ ─ ─ ─ ─╱─╲─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╱─── ─  │
  │               ╱      ╲               ╱╱               │
  │  $1k ─ ─ ╱─ ─ ─ ─ ─ ─╲─ ─ ─ ─╱─ ─ ─ ─ ─ ─ ─ ─ ─  │
  │                          ╲  ╱                         │
  │  $0  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╲─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
  │   Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb │
  └──────────────────────────────────────────────────────┘
```

**Chart specs:**
- `ResponsiveContainer width="100%" height={280}`
- Area chart with gradient fill (theme's chart gradient start → transparent)
- Stroke: theme's `chartStroke` or `accent`, 2px
- Y-axis: visible, formatted as `$Xk`, tick count ~4, light grid lines
- X-axis: month abbreviations from `monthly.monthly` data
- 3-month rolling average: dashed overlay line, muted color, 1px stroke
- CartesianGrid: dashed, muted (Arctic: `rgba(255,255,255,0.04)`, Paper: `#F3F4F6`)
- Custom Recharts Tooltip matching theme (see Cross-Cutting Notes in 04_02)
- Animation: standard Recharts draw animation, 1000ms

**Container:** Full width within the `max-w-4xl` column. Wrapped in a `ThemedPanel` with `p-6` padding. No section header label — the chart speaks for itself.

**Justification:** User goal #2 — trend direction. The Y-axis matters because "is $2,345 a lot?" depends on whether previous months were $1,500 or $3,000. The rolling average adds context without complexity.

### Section 3: Categories + Cards (side-by-side)

**Sources:** Pulse (trend indicators ▲/▼ on categories) + Command Deck (horizontal bars for magnitude) + Mosaic (compact colored-dot card list)

**Layout:** `grid grid-cols-1 md:grid-cols-2 gap-4` — side-by-side on desktop, stacked on mobile.

#### Categories Panel (left)

```
  CATEGORIES                              ← ThemedLabel, xs, uppercase

  Dining      $680   ▲ 45%               ← name (body font), amount (font-mono), trend (colored)
  ██████████████████████████████████████  ← proportion bar, colored with CATEGORY_COLORS

  Groceries   $520   ▲ 12%
  ████████████████████████████

  Shopping    $420   ▼ 8%
  ██████████████████████

  Gas         $180   ─
  █████████
```

**Data:** Top categories from `summary.by_category`, sorted by amount descending. Show top 5 (or fewer if less data).

**Trend indicators:** Derived from `forecast.category_forecasts` or `anomalies`. For each category:
- If current month is >10% above average: `▲` in `danger` color with percentage
- If current month is >10% below average: `▼` in `success` color with percentage
- Otherwise: `─` in `textMuted`

**Proportion bars:** Thin bars (h-1.5, rounded-full) showing relative magnitude. The highest-spending category is 100% width, others proportional. Color from `CATEGORY_COLORS` constant at 60% opacity.

**Row layout:** Each category row has: name (left, body font), amount (right, `font-mono`), trend arrow + percentage (far right, colored). Bar below spans full row width.

#### Cards Panel (right)

```
  CARDS                                   ← ThemedLabel, xs, uppercase

  ● Amex Gold       $1,200               ← colored dot (card.color), label, amount (font-mono)
  ████████████████████████████████████    ← proportion bar in card color

  ● Citi Costco     $800
  ████████████████████████

  ● Capital One     $345
  ████████████
```

**Data:** All cards from `summary.by_card`, sorted by total descending.

**Colored dot:** 8px circle (`w-2 h-2 rounded-full`) filled with the card's color from `getCardColor()` or the card's `color` field.

**Proportion bars:** Same treatment as categories but colored with the card's color at 40% opacity.

**Justification:** User goals #1 and #3 — "where did the money go?" is answered by categories with magnitude (bars) AND direction (arrows). Card split answers "which card is carrying the weight?" The side-by-side layout uses horizontal space efficiently without creating grid complexity.

### Section 4: Top Merchants

**Source:** Daily Journal (merchant cards with name + visits + amount — tells a story)

```
  TOP MERCHANTS                          ← ThemedLabel, xs, uppercase

  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │ Chick-fil-A      │ │ Chipotle         │ │ Starbucks        │
  │ 8 visits · $78   │ │ 5 visits · $63   │ │ 12 visits · $54  │
  │ ● Amex Gold      │ │ ● Citi Costco    │ │ ● Capital One    │
  └──────────────────┘ └──────────────────┘ └──────────────────┘
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │ Amazon           │ │ Uber             │ │ Target           │
  │ 3 visits · $120  │ │ 7 visits · $45   │ │ 2 visits · $89   │
  │ ● Amex Gold      │ │ ● Capital One    │ │ ● Citi Costco    │
  └──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Layout:** `grid grid-cols-2 md:grid-cols-3 gap-3` inside a full-width `ThemedPanel`.

**Data:** Top 6 merchants from `merchants` data, sorted by total descending.

**Each merchant card:** A mini panel (subtle inner container, not a full ThemedPanel — use a lighter background):
- **Name:** Merchant name, body font, medium weight, truncated with ellipsis if long
- **Stats:** `{transaction_count} visits · ${total}` — `font-mono` for the amount, body font for "visits"
- **Card indicator:** Small colored dot + card label (xs, muted) — shows which card this merchant charges

**Arctic inner card:** `bg-white/[0.03] rounded-xl p-4`
**Paper inner card:** `bg-gray-50 rounded-xl p-4 border border-gray-100`

**Animation:** Staggered entry from bottom, 60ms between cards, viewport-triggered.

**Justification:** User goal #3 — "What's draining me?" Merchants answer this more concretely than categories. "Starbucks, 12 visits, $54" is actionable in a way that "Dining $680" isn't. The card color dot connects the merchant to the physical card in the user's wallet.

### Section 5: Alert (Conditional)

**Source:** Pulse (alert card with severity border) + Daily Journal (narrative voice)

**Renders only if:** `anomalies.length > 0`

```
  ▌ Dining is running 45% above your average this month.
  ▌ At this pace, you'll hit $890 by end of February —
  ▌ $220 more than typical.
```

**Design:** A single `ThemedPanel` with a colored left border (4px):
- `high` severity: `danger` color border
- `elevated` severity: `accent` color border
- `normal` severity: `textMuted` color border

**Content:** One paragraph of prose, not a data card. The narrative is generated from the highest-severity anomaly:
- Template: `"{category} is running {pct_above_avg}% above your average this month. At this pace, you'll hit ${projected} by end of {month} — ${difference} more than typical."`
- Use the category's forecast from `forecast.category_forecasts` for the projected amount
- Dollar amounts in `font-mono`, rest in body font
- Tone: informative, not alarming. This isn't a warning — it's context.

**Justification:** User goal #3 — surfaces the most unusual spending without the user needing to hunt for it. The narrative voice (from Daily Journal) makes it feel like a helpful observation, not a system alert.

### Section 6: Subscriptions (Conditional)

**Source:** Pulse (inline compact subscriptions) + Command Deck (subscription grid)

**Renders only if:** `recurring` data exists and has items

```
  SUBSCRIPTIONS · $450/mo · 8 active     ← summary line

  Netflix $16 · Spotify $11 · Gym $50 · iCloud $3 · YouTube $14 · +3 more

  ⚠ 1 possibly forgotten (Headspace · last charged 47 days ago)
```

**Design:** A single `ThemedPanel`, compact:
- **Summary line:** "SUBSCRIPTIONS" label + total monthly + active count, all on one line
- **List:** Inline flow of subscription names + amounts, separated by ` · ` (middle dot). Show top 6, then `+N more` if more exist. `font-mono` for amounts.
- **Warning (conditional):** If any recurring items have `status === "forgotten"`, show a warning line with `⚠` icon, merchant name, and days since last charge. Text in `danger` color (muted, not screaming).

**Justification:** User goal #3 — subscriptions are silent drains. The compact format gives awareness without dedicating a whole section. The forgotten subscription warning surfaces the one actionable thing.

### Section 7: Insight (Conditional)

**Source:** Pulse (pull-quote styling) + Daily Journal (behavioral patterns)

**Renders only if:** `insights?.[0]` exists

```
  "Your weekend spending is 85% higher than weekdays.
   Saturday is your most expensive day at $89 average."
```

**Design:** A `ThemedPanel` with the top insight displayed as a pull-quote:
- Display font (Outfit/Fraunces), larger size (`text-lg` or `text-xl`)
- Opening quotation mark as a decorative element: large, accent-colored, positioned absolutely top-left
- Text centered within the panel
- `font-mono` for any dollar amounts or percentages within the quote
- No label header — the quote format signals "this is an insight"

**Justification:** User goal #6 — patterns the user would miss. The pull-quote format makes it feel like a discovery, not a data point. It rewards the user for scrolling this far.

---

## Animation Strategy

**Philosophy:** One orchestrated page load, then stillness. No constant motion. The Meridian layout should feel like it *arrives*, then rests.

### Load Sequence (on mount)

| Delay | Element | Animation |
|-------|---------|-----------|
| 0ms | Month label | `opacity: 0 → 1`, 400ms ease |
| 100ms | Hero number | Count-up from 0, spring (stiffness: 80, damping: 15) |
| 300ms | Pill 1 (vs last) | `scale: 0.9, opacity: 0 → scale: 1, opacity: 1`, 300ms |
| 400ms | Pill 2 (vs avg) | Same |
| 500ms | Pill 3 (on pace) | Same |
| 600ms | Scroll indicator | `opacity: 0 → 0.4`, 800ms ease |

### Scroll Reveals (viewport-triggered, `once: true`)

| Element | Animation | Duration |
|---------|-----------|----------|
| Trend chart panel | `opacity: 0, y: 20 → opacity: 1, y: 0` | 500ms |
| Categories panel | `opacity: 0, y: 20 → opacity: 1, y: 0` | 500ms |
| Cards panel | Same, 100ms delay after categories | 500ms |
| Merchant cards | Staggered: `opacity: 0, y: 12 → opacity: 1, y: 0`, 60ms between | 400ms each |
| Alert panel | `opacity: 0, x: -8 → opacity: 1, x: 0` | 400ms |
| Subscriptions | `opacity: 0 → 1` | 400ms |
| Insight quote | `opacity: 0 → 1`, slow | 800ms |

**Viewport margin:** `-60px` — elements start animating slightly before they're fully in view, creating a smooth scroll experience.

---

## Responsive Behavior

| Breakpoint | Changes |
|------------|---------|
| **1024px+** | `max-w-4xl`, categories/cards side-by-side, merchants 3-col |
| **768–1023px** | `max-w-3xl`, categories/cards side-by-side, merchants 2-col |
| **<768px** | Full-width with `px-4`, categories/cards stack, merchants 2-col, hero 5xl→4xl, pills wrap if needed |

---

## Theme Compatibility

Meridian must work in both Arctic Glass (dark) and Paper Light (light) styles via `useTheme()`. All styling decisions use theme tokens, not hardcoded colors.

**Arctic specifics:**
- Background blobs behind the hero section and trend chart for glassmorphism depth
- Glass panels on all ThemedPanel instances
- Sky-blue accent on pill borders, chart stroke, category/card dots
- Scroll indicator: `bg-white/20`

**Paper specifics:**
- Paper island wrapper around the entire layout
- White cards with hairline borders and micro-shadows
- Emerald accent on positive trends, charcoal for chart stroke
- Scroll indicator: `bg-gray-300`

---

## Data Used

| Section | Data source | Fields |
|---------|-------------|--------|
| Hero | `summary` | `this_month` |
| Month label | `summary` or derive from current date | month + year |
| Pill: vs last | `summary` | `mom_change_pct` |
| Pill: vs avg | `summary` | `vs_avg_pct` |
| Pill: on pace | `forecast` | `projected` |
| Trend chart | `monthly` | `monthly` array (month + total) |
| Categories | `summary` | `by_category` array |
| Category trends | `anomalies` or `forecast` | `category_forecasts`, `pct_above_avg` |
| Cards | `summary` | `by_card` array |
| Card colors | `cards` | `color` field per card |
| Merchants | `merchants` | top 6 by total |
| Alert | `anomalies` | highest severity entry |
| Alert projection | `forecast` | `category_forecasts` for alert category |
| Subscriptions | `recurring` | all items, totals, forgotten status |
| Insight | `insights` | first item by severity |

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/components/dashboards/layouts/meridian.tsx` | The layout component |
| `frontend/src/app/page.tsx` | Updated root route → renders Meridian |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/components/dashboards/design-trial-navigator.tsx` | Add layout 6 "Meridian" to navigator, or replace navigator with simpler style toggle since Meridian is the final layout |
| `frontend/src/components/sidebar.tsx` | Update dashboard link to point to `/` instead of `/1`, optionally keep experimental layouts accessible under a "Lab" section |

### Preserved (not deleted)

Keep layouts 1–5 accessible at `/1` through `/5` for reference. They're experiments that informed Meridian — no need to delete them, but they shouldn't be the default experience.

---

## Detailed Tasks

### Task 1: Build Meridian Layout Component

**File:** `frontend/src/components/dashboards/layouts/meridian.tsx`

Build the full layout following the section specifications above. The component:
- Accepts the same `DashboardLayoutProps` as other layouts (summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards)
- Uses `useTheme()` for all style decisions
- Uses `ThemedPanel`, `ThemedBackground`, `ThemedLabel`, `ThemedText` from themed-components
- Implements the load sequence animation (hero spring, pill stagger, scroll indicator fade)
- Implements viewport-triggered scroll reveals for below-fold sections
- Conditionally renders alert, subscriptions, and insight sections
- Handles empty states gracefully (if no data, hero shows $0 with no pills, chart shows empty state)

### Task 2: Update Root Route

**File:** `frontend/src/app/page.tsx`

- Remove any redirect to `/1`
- Render the Meridian layout directly as the default dashboard
- Wrap in `ThemeProvider`
- Include the navigator/style toggle

### Task 3: Update Navigator

**File:** `frontend/src/components/dashboards/design-trial-navigator.tsx`

Add Meridian as layout 6 to the navigator. Update labels:
```typescript
const LAYOUTS = [
  { id: 0, name: "Meridian", desc: "The definitive layout" },
  { id: 1, name: "Zen Flow", desc: "Single column, progressive disclosure" },
  { id: 2, name: "Command Deck", desc: "Dense grid, everything visible" },
  { id: 3, name: "Daily Journal", desc: "Timeline narrative, scrolling story" },
  { id: 4, name: "Mosaic", desc: "Bento grid, visual density with breathing room" },
  { id: 5, name: "Pulse", desc: "Card stack, swipeable metric cards" },
] as const;
```

Meridian button should be visually distinct (accent-colored or underlined) to indicate it's the production layout.

### Task 4: Update Sidebar

**File:** `frontend/src/components/sidebar.tsx`

- Default "Dashboard" link points to `/` (Meridian)
- Experimental layouts grouped under a collapsible "Lab" section or similar

### Task 5: Create Route Page for Meridian

**File:** `frontend/src/app/page.tsx`

Same wiring pattern as `/1/page.tsx`:
```tsx
"use client";
import { ThemeProvider } from "@/components/theme-provider";
import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { Meridian } from "@/components/dashboards/layouts/meridian";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DashboardPage() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } = useDashboardData();

  return (
    <ThemeProvider>
      <div className="pt-12">
        <DesignTrialNavigator currentLayout={0} useTestData={useTestData} onToggleTestData={toggleTestData} />
        {/* Loading / Error states */}
        <Meridian
          summary={summary}
          monthly={monthly}
          forecast={forecast}
          anomalies={anomalies}
          recurring={recurring}
          insights={insights}
          habits={habits}
          daily={daily}
          merchants={merchants}
          cards={cards}
        />
      </div>
    </ThemeProvider>
  );
}
```

---

## Verification

1. `bun dev` — compiles without errors
2. `npx tsc --noEmit` — no TypeScript errors
3. Browser: `/` shows Meridian layout with Arctic style by default
4. Hero stat is the largest element on the page, centered, animated count-up
5. Three context pills appear below hero with correct colors (danger for overspend, success for under)
6. Scrolling reveals trend chart with smooth fade-in
7. Categories and Cards appear side-by-side with proportion bars and trend indicators
8. Top merchants grid shows 6 merchants with card color indicators
9. Alert section only appears when anomalies exist, with narrative prose and colored left border
10. Subscriptions section only appears when recurring data exists
11. Insight appears as a styled pull-quote
12. Toggle to Paper style — everything adapts (paper island, white cards, emerald accents, Fraunces/Source Serif fonts)
13. Toggle to Arctic style — glassmorphism, glass panels, sky-blue, Outfit/DM Sans
14. Style toggle persists in localStorage
15. Responsive: at 768px, categories/cards stack, merchants go to 2-col
16. Responsive: at <640px, hero shrinks to 4xl, pills still readable
17. All financial amounts use `font-mono` except the hero number
18. Test Data toggle works — Meridian renders test data correctly
19. Experimental layouts still accessible at `/1` through `/5`
20. Sidebar "Dashboard" link goes to `/` (Meridian)
21. No layout shift or jank during scroll reveals
22. Empty state: with no data, the page still renders gracefully (hero shows $0, no below-fold sections)
