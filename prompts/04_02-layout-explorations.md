# Prompt 04_02: Layout Explorations — 5 Dashboard Layouts with Arctic Glass & Paper Light Styles

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

## Goal

Keep route `/1` as the current zen single-column layout (now style-toggleable), and create **4 new dashboard layouts** at routes `/2` through `/5` that present Ledgr's financial data in fundamentally different spatial arrangements. All 5 layouts are **toggleable between Arctic Glass and Paper Light design styles** and support **dark/light mode** switching.

The previous prompt (04_01) established 5 different visual styles on the **same zen layout**. This prompt keeps only the two best styles (Arctic Glass + Paper Light) and explores **different layout structures** — how the dashboard content is spatially arranged, which data gets prominence, and how the user navigates through their financial picture.

**What changes:**
- Route `/1` keeps the current zen layout, now toggleable between Arctic and Paper styles
- Routes `/2` through `/5` each get a new unique layout, all style-toggleable
- Each layout renders in either Arctic Glass or Paper Light style (user toggles)
- A dark/light mode toggle is added to the navigator bar
- The navigator is updated to reflect layouts instead of style variants

**What stays:**
- The Arctic Glass and Paper Light design components (colors, fonts, effects, motion patterns)
- The `useDashboardData()` hook and all data types
- The sidebar, shared UI components, and functional pages

---

## Prerequisites

- Prompt 04_01 completed: Arctic Glass and Paper Light design components exist
- `useDashboardData()` hook returns all necessary data
- All types (`EnhancedSummaryStats`, `MonthlyData`, `ForecastData`, `CategoryAnomaly`, `RecurringTransaction`, `Insight`, `HabitAnalysis`, `DailySpending`, etc.) defined in `src/types/index.ts`

---

## Design System: Dark/Light Mode

Each layout must work in both dark mode (Arctic Glass) and light mode (Paper Light). Rather than duplicating every component, use a **theme context** that provides the correct colors, fonts, and effects.

### Theme Provider

**File:** `frontend/src/components/theme-provider.tsx`

Create a React context that manages:
- `style`: `"arctic"` | `"paper"` — which design language to use
- `mode`: `"dark"` | `"light"` — derived from style (arctic = dark, paper = light), but could also be toggled independently in the future

```typescript
interface ThemeConfig {
  style: "arctic" | "paper";
  // Colors
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  danger: string;
  // Fonts
  displayFont: string;   // Hero numbers, headings
  bodyFont: string;       // Labels, body text
  // Effects
  glassPanel: string;     // CSS classes for panel treatment
  cardShadow: string;     // Box shadow for elevated elements
}

const ARCTIC_THEME: ThemeConfig = {
  style: "arctic",
  bg: "#0A0A0F",
  surface: "rgba(255, 255, 255, 0.03)",
  border: "rgba(255, 255, 255, 0.06)",
  text: "#FFFFFF",
  textMuted: "rgba(125, 211, 252, 0.35)",
  accent: "#7DD3FC",
  accentMuted: "rgba(125, 211, 252, 0.15)",
  danger: "#F87171",
  displayFont: "var(--font-outfit)",
  bodyFont: "var(--font-dm-sans)",
  glassPanel: "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl",
  cardShadow: "0 0 30px rgba(125, 211, 252, 0.05)",
};

const PAPER_THEME: ThemeConfig = {
  style: "paper",
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#1A1A1A",
  textMuted: "#9CA3AF",
  accent: "#059669",
  accentMuted: "rgba(5, 150, 105, 0.1)",
  danger: "#DC2626",
  displayFont: "var(--font-fraunces)",
  bodyFont: "var(--font-source-serif)",
  glassPanel: "bg-white border border-gray-200 rounded-2xl shadow-sm",
  cardShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
};
```

The provider wraps the layout content and exposes `theme`, `style`, `setStyle` via context. Components use `useTheme()` to access current colors and fonts.

### Dark/Light Mode Implementation

- **Arctic Glass (dark):** Uses the existing dark background (`#0A0A0F`), frosted glass panels, sky-blue accents, Outfit/DM Sans fonts, background blobs for glassmorphism
- **Paper Light (light):** Uses warm off-white (`#FAFAF8`), crisp white surfaces, emerald accents, Fraunces/Source Serif fonts, subtle shadows instead of glass

The "paper island" technique from 04_01 should be preserved: when Paper Light is active, the main content area becomes a light sheet floating within the dark app shell (sidebar stays dark).

---

## Updated Navigator Bar

**File:** `frontend/src/components/dashboards/design-trial-navigator.tsx`

Replace the current 5-design navigator with a new navigator that has:

1. **Layout selector** — 5 numbered buttons for layouts 1–5
2. **Style toggle** — "Arctic" / "Paper" toggle switch
3. **Test Data toggle** — preserved from current implementation

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Layout: [1. Zen] [2. Command] [3. Journal] [4. Mosaic] [5. Pulse]  │  🧊 Arctic ⟷ 📄 Paper  │  Test Data │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

The style toggle should be a compact pill-shaped switch:
- Arctic active: sky-blue highlight with snowflake/ice icon or "Arctic" text
- Paper active: emerald highlight with paper/leaf icon or "Paper" text
- Smooth transition between states (slide + color crossfade)

**Props update:**
```typescript
interface DesignTrialNavigatorProps {
  currentLayout: 1 | 2 | 3 | 4 | 5;
  useTestData?: boolean;
  onToggleTestData?: () => void;
}
```

The style selection state lives in the ThemeProvider (shared across all layouts). The navigator reads and writes to it via `useTheme()`.

**Layout labels:**
```typescript
const LAYOUTS = [
  { id: 1, name: "Zen Flow", desc: "Single column, progressive disclosure" },
  { id: 2, name: "Command Deck", desc: "Dense grid, everything visible" },
  { id: 3, name: "Daily Journal", desc: "Timeline narrative, scrolling story" },
  { id: 4, name: "Mosaic", desc: "Bento grid, visual density with breathing room" },
  { id: 5, name: "Pulse", desc: "Card stack, swipeable metric cards" },
] as const;
```

---

## Route Structure

| Route | Layout | Description |
|-------|--------|-------------|
| `/1` | Zen Flow | Current single-column zen layout (from 04_01), now style-toggleable |
| `/2` | Command Deck | Dense information grid for power users |
| `/3` | Daily Journal | Timeline/narrative scrolling layout |
| `/4` | Mosaic | Bento-style asymmetric grid |
| `/5` | Pulse | Card-stack layout with swipeable metric cards |

Update the root `page.tsx` redirect to still point to `/1`.

Each route page follows this pattern:
```tsx
"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { LayoutComponent } from "@/components/dashboards/layouts/layout-name";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function LayoutPage() {
  const { summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <ThemeProvider>
      <div className="pt-12">
        <DesignTrialNavigator currentLayout={N} useTestData={useTestData} onToggleTestData={toggleTestData} />
        {loading ? (
          <LoadingSkeleton />
        ) : error || !summary ? (
          <EmptyState ... />
        ) : (
          <LayoutComponent
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
        )}
      </div>
    </ThemeProvider>
  );
}
```

---

## Shared Layout Props Interface

All 5 layouts receive the same props:

```typescript
interface DashboardLayoutProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
  habits: HabitAnalysis | null;
  daily: DailySpending[] | null;
  merchants: EnhancedMerchant[] | null;
  cards: Card[];
}
```

This is a superset of the previous `ZenVariantProps` — layouts that need more data (Command Deck, Mosaic) have access to `habits`, `daily`, `merchants`, and `cards`. Layouts that don't need them can ignore them.

---

## File Structure

```
frontend/src/components/dashboards/
├── design-trial-navigator.tsx          # Updated navigator with layout + style toggle
├── theme-provider.tsx                  # Arctic/Paper theme context
├── themed-components.tsx               # Shared themed primitives (ThemedCard, ThemedChart, etc.)
├── layouts/
│   ├── zen-flow.tsx                    # Layout 1: Single-column zen (refactored from arctic-glass + paper-light)
│   ├── command-deck.tsx                # Layout 2: Dense grid
│   ├── daily-journal.tsx               # Layout 3: Timeline narrative
│   ├── mosaic.tsx                      # Layout 4: Bento grid
│   └── pulse.tsx                       # Layout 5: Card stack with swipeable metrics
├── arctic-glass.tsx                    # KEEP — reference for Arctic style tokens, may still be imported
└── paper-light.tsx                     # KEEP — reference for Paper style tokens, may still be imported
```

---

## Shared Themed Components

**File:** `frontend/src/components/dashboards/themed-components.tsx`

Create a set of theme-aware primitives that each layout uses. These adapt their appearance based on the active theme (Arctic or Paper).

### ThemedPanel
Container for content sections. In Arctic mode: glassmorphism panel with backdrop blur. In Paper mode: white card with subtle border and shadow.
```tsx
function ThemedPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  const { theme } = useTheme();
  return (
    <div
      className={cn(theme.glassPanel, className)}
      style={{ boxShadow: theme.cardShadow }}
    >
      {children}
    </div>
  );
}
```

### ThemedChart
Wrapper for Recharts charts that provides the correct axis colors, tooltip styling, gradient definitions, and grid styling based on the active theme.

- **Arctic:** Sky-blue stroke, blue gradient fill, dark tooltip with glass styling, muted blue axis text
- **Paper:** Charcoal stroke, emerald gradient fill at low opacity, white tooltip with border, gray axis text

### ThemedHeading
Typography component that uses the correct display font per theme.

### ThemedText
Body text component that uses the correct body font and text color per theme.

### ThemedBackground
For Arctic mode: renders the decorative background blobs (blurred radial gradients) needed for glassmorphism. For Paper mode: renders the "paper island" wrapper with light background, rounded corners, and shadow.

---

## Layout 1: Zen Flow (Current Layout, Refactored)

**File:** `frontend/src/components/dashboards/layouts/zen-flow.tsx`

**Philosophy:** The existing single-column, progressive-disclosure layout from 04_01. One hero number, one chart, scroll to reveal details. Maximum calm.

**This is a refactor of the current Arctic Glass / Paper Light components into a single theme-aware component.** The layout skeleton is identical to what exists — the only change is that style is determined by the theme context instead of being hardcoded.

### Layout Structure (unchanged from 04_01)

```
┌─────────────────────────────────────────────────────────────────┐
│                          [Label]                                │
│                       [Hero Number]                             │
│                     [Comparison Line 1]                         │
│                     [Comparison Line 2]                         │
│     ┌───────────────────────────────────────────────────┐       │
│     │         [Large area chart — 12 months]            │       │
│     └───────────────────────────────────────────────────┘       │
│                      [Scroll indicator]                         │
├─────────────────────────────────────────────────────────────────┤
│                   [Section: Top Drivers]                         │
│                    Category1: $XXX (+YY%)                        │
│                    Category2: $XXX (+YY%)                        │
├─────────────────────────────────────────────────────────────────┤
│                   [Section: Recurring]                           │
│                       $XXX / month                              │
│                    N active subscriptions                        │
├─────────────────────────────────────────────────────────────────┤
│                   [Section: Top Insight]                         │
│                    [Insight message]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Layout constants:** `max-w-3xl mx-auto`, `py-16` hero section, `py-12` scroll sections, centered text.

**Arctic style:** Background blobs, glass panels on scroll sections, sky-blue accent, spring animations on hero, Outfit/DM Sans fonts, chevron scroll indicator.

**Paper style:** Paper island wrapper, white surfaces with borders, emerald accent, minimal motion, Fraunces/Source Serif fonts, "details" line-through scroll indicator.

### Data Used
- `summary`: this_month, mom_change_pct, vs_avg_pct
- `forecast`: projected, trajectory
- `monthly`: 12-month trend chart
- `anomalies`: top 3 category drivers
- `recurring`: subscription summary
- `insights`: top insight

---

## Layout 2: Command Deck

**File:** `frontend/src/components/dashboards/layouts/command-deck.tsx`

**Philosophy:** Maximum information density. Every key metric visible simultaneously without scrolling. Inspired by Bloomberg terminals, mission control dashboards, and cockpit instrument panels. For power users who want to absorb their full financial picture at a glance.

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌──────────────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │                       │  │ This Mo  │  │ Last Mo  │  │                  │ │
│  │   HERO NUMBER         │  │ $2,345   │  │ $2,100   │  │  Anomaly Alerts  │ │
│  │   with projected      │  │ +12% MoM │  │ baseline │  │  2 high  1 med   │ │
│  │   end-of-month        │  │          │  │          │  │                  │ │
│  └──────────────────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────┐  ┌──────────────────────────────┐│
│  │                                        │  │                              ││
│  │     Monthly Trend (12mo line chart)    │  │   Category Breakdown         ││
│  │     with rolling avg overlay           │  │   (horizontal stacked bars)  ││
│  │     280px height                       │  │   with category colors       ││
│  │                                        │  │                              ││
│  └────────────────────────────────────────┘  └──────────────────────────────┘│
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────────────┐│
│  │ By Card      │  │ Top Merchants│  │ Smart Insights (top 3)              ││
│  │              │  │              │  │                                      ││
│  │ Amex  $1.2k  │  │ COSTCO $340  │  │ * Dining 2.3σ above avg            ││
│  │ Citi  $800   │  │ AMAZON $280  │  │ * Weekend +85% vs weekday          ││
│  │ Cap1  $300   │  │ WHOLE  $210  │  │ * Projected to exceed avg 18%      ││
│  │              │  │              │  │                                      ││
│  └──────────────┘  └──────────────┘  └──────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────┐│
│  │ Recurring / Subscriptions                │  │  7-Day Spending Velocity   ││
│  │ $450/mo · 8 active · 1 forgotten        │  │  [mini heatmap or sparks]  ││
│  │ ┌───────┬───────┬────────┬──────┐       │  │  Mon Tue Wed ... Sun       ││
│  │ │Netflix│Spotify│Gym     │iCloud│       │  │  $45  $12  $89  ... $63   ││
│  │ │ $16   │ $11   │ $50    │ $3   │       │  │                            ││
│  │ └───────┴───────┴────────┴──────┘       │  │  Daily avg: $52            ││
│  └──────────────────────────────────────────┘  └────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Grid System
- Container: `max-w-7xl mx-auto px-6` — wide layout, uses available horizontal space
- Top stats row: `grid grid-cols-4 gap-4` — hero stat (spans 1), this/last month stat cards, anomaly alerts
- Charts row: `grid grid-cols-5 gap-4` — trend chart (spans 3), category breakdown (spans 2)
- Middle row: `grid grid-cols-3 gap-4` — by card, top merchants, insights
- Bottom row: `grid grid-cols-5 gap-4` — recurring (spans 3), velocity (spans 2)
- Everything fits above the fold on a 1440px+ display. On smaller screens, gracefully collapse to 2-column or stacked.

### Key Design Elements

**Information hierarchy through size:**
- Hero number is large but shares the top row (not a full-width centerpiece like Zen)
- Charts get the most vertical space (280px)
- Lists and stats are compact, dense, scannable

**Arctic style:**
- Glass panels for every grid cell
- Monochromatic sky-blue stat highlights
- Chart uses sky-blue gradient
- Subtle grid lines between panels via gap
- Compact, precise DM Sans typography

**Paper style:**
- White cards with hairline borders and micro-shadows
- Charcoal numbers, emerald accent for positive trends
- Chart uses charcoal stroke with faint emerald fill
- Clean separation via white space and borders
- Source Serif for labels gives a financial-report feel

**Data density rules:**
- Stat cards show value + comparison in 2 lines max
- Lists show top 3–4 items only (truncated with count)
- Insights show abbreviated one-liners, not full messages
- Card colors as left-border accents on the by-card list
- Category colors as dot indicators, not large swatches

### Data Used
- `summary`: this_month, last_month, avg_monthly, projected_month_total, by_category, by_card
- `monthly`: 12-month trend line with 3-month rolling average
- `forecast`: projected, vs_average, trajectory
- `anomalies`: severity counts for alert badge, category detail
- `merchants`: top 4
- `recurring`: subscription list (top 4), total monthly, active count, forgotten count
- `insights`: top 3 by severity
- `daily`: last 7 days for velocity section
- `cards`: for card colors

### Animations
- Stagger fade-in for each grid cell (50ms delay between, left-to-right, top-to-bottom)
- Numbers count up on mount (400ms spring)
- Charts animate draw (800ms)
- Hover on any panel: subtle lift (`translateY(-1px)`) + slightly brighter border
- No scroll-based animations — everything loads immediately since the layout is above-the-fold

### Responsive Behavior
- 1440px+: Full 5-column grid as shown
- 1024–1439px: Collapse to 3 columns, charts stack full-width
- 768–1023px: 2 columns
- <768px: Single column stack

---

## Layout 3: Daily Journal

**File:** `frontend/src/components/dashboards/layouts/daily-journal.tsx`

**Philosophy:** Your finances told as a story. A vertical, scrolling narrative that reads like a personal finance journal entry. Each section builds context — what happened, why it matters, what to do. Prose-first, with charts and numbers woven in as supporting evidence. Inspired by long-form editorial design, annual reports, and scrollytelling.

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    February 2026                           │
│                                                            │
│              "A steady month so far."                      │
│                                                            │
│   So far this month, you've spent $2,345 across            │
│   67 transactions. That's 6% below your typical            │
│   pace — you're doing well.                                │
│                                                            │
│   ┌────────────────────────────────────────────────┐       │
│   │                                                │       │
│   │    [Trajectory area chart]                     │       │
│   │    Projected $2,480 vs Average $2,650          │       │
│   │    with "you are here" marker                  │       │
│   │                                                │       │
│   └────────────────────────────────────────────────┘       │
│                                                            │
│                    ─ ─ ─ ─ ─ ─                             │
│                                                            │
│                  Where it's going                          │
│                                                            │
│   Dining has spiked this month — $680, which is            │
│   45% above your typical spending. Your top spots:         │
│                                                            │
│     CHICK-FIL-A    8 visits    $78                         │
│     CHIPOTLE       5 visits    $63                         │
│     STARBUCKS      12 visits   $54                         │
│                                                            │
│   ┌────────────────────────────────────────────────┐       │
│   │  [Category comparison mini-chart]              │       │
│   │  This month vs average, horizontal bars        │       │
│   └────────────────────────────────────────────────┘       │
│                                                            │
│                    ─ ─ ─ ─ ─ ─                             │
│                                                            │
│                  The good news                             │
│                                                            │
│   Shopping is down 12% from last month. Your               │
│   subscriptions ($450/mo) are stable — no new              │
│   charges detected this month.                             │
│                                                            │
│   ┌────────────────────────────────────────────────┐       │
│   │  [Spending by card — simple proportional bars] │       │
│   └────────────────────────────────────────────────┘       │
│                                                            │
│                    ─ ─ ─ ─ ─ ─                             │
│                                                            │
│                  Your patterns                             │
│                                                            │
│   You spend 85% more on weekends than weekdays.            │
│   Your busiest day is Saturday ($89 average).              │
│                                                            │
│   3 impulse purchases this week ($38 total).               │
│                                                            │
│                    ─ ─ ─ ─ ─ ─                             │
│                                                            │
│                  Looking ahead                             │
│                                                            │
│   At this pace, you'll finish February at ~$2,480.         │
│   That would be $170 below your 3-month average.           │
│                                                            │
│   Categories to watch:                                     │
│   * Dining — if it stays at this pace, $890 by EOM         │
│   * Gas — trending 20% above average                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Layout Philosophy
- **Narrow column:** `max-w-2xl mx-auto` — even narrower than Zen Flow, optimized for reading prose
- **Vertical rhythm:** Generous spacing between sections (`py-16`). Each section is a "chapter" in the journal
- **Section dividers:** Subtle dashed or dotted horizontal rules between chapters
- **Charts are inline illustrations**, not the centerpiece — they support the narrative text
- **Prose-first:** Paragraphs of natural language with `font-mono` dollar amounts woven in

### Narrative Generation

The component builds prose dynamically from data. Key narrative blocks:

**Opening headline** — conditional on `forecast.trajectory`:
- `below_average`: "A steady month so far." / "You're doing great this month."
- `near_average`: "Right on track."
- `above_average`: "Spending is running a bit hot."
- `well_above_average`: "This month needs attention."

**Opening paragraph:** Template using `summary.this_month`, `summary.transaction_count`, `summary.vs_avg_pct`

**Where it's going:** Uses highest-severity `anomalies` entry. Lists top 3 `merchants` within that category. Shows a mini category comparison chart (this month vs average per category, horizontal bars).

**The good news:** Finds categories with negative trends from `habits.category_creep` (decreasing = good). Mentions recurring stability from `recurring`.

**Your patterns:** Uses `habits.weekend_splurge`, `habits.impulse_spending`, `habits.merchant_concentration`. Only includes patterns with notable findings (skip sections where behavior is normal).

**Looking ahead:** Uses `forecast.projections.recommended`, `forecast.vs_average`, and `forecast.category_forecasts` for categories trending above average.

### Arctic Style Specifics
- Section headers in sky-blue accent
- Charts use sky-blue gradients
- Merchant list items have faint glass panel backgrounds
- Dashed dividers in sky-blue at 15% opacity
- Opening quote in Outfit font, larger size
- Body text in DM Sans at comfortable reading size (16px)

### Paper Style Specifics
- Section headers in charcoal with emerald underline accent
- Charts use charcoal stroke with emerald fills
- Merchant list items have white backgrounds with subtle borders
- Solid hairline dividers in gray-200
- Opening quote in Fraunces, slightly italicized feel
- Body text in Source Serif 4 at reading size (17px for serif readability)

### Animations
- Sections reveal as they scroll into viewport (`whileInView`, `once: true`)
- Opening headline fades in with 0.8s duration
- Charts draw when visible (standard Recharts animation)
- Merchant list items stagger in from left (100ms per item)
- Dollar amounts have a subtle highlight pulse on first appearance
- Minimal — the journal aesthetic values stillness over movement

### Data Used
- `summary`: this_month, transaction_count, vs_avg_pct, by_category, by_card
- `forecast`: trajectory, projections.recommended, vs_average, category_forecasts
- `anomalies`: highest severity for narrative conflict
- `merchants`: top 3 within anomaly category
- `habits`: weekend_splurge, impulse_spending, category_creep, merchant_concentration
- `recurring`: total monthly, count, stability
- `monthly`: for trajectory chart

---

## Layout 4: Mosaic

**File:** `frontend/src/components/dashboards/layouts/mosaic.tsx`

**Philosophy:** A bento-box inspired grid where different-sized tiles create visual rhythm and hierarchy. Some tiles are large (charts, key stats), some are small (badges, mini-stats), creating an asymmetric but balanced composition. The eye moves naturally across the grid, discovering information at different scales. Inspired by Japanese bento layouts, magazine grid designs, and iOS widget screens.

### Layout Structure

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────────┐  ┌─────────┐  ┌───────────────┐ │
│  │                              │  │  THIS    │  │               │ │
│  │    HERO:  $2,345.67          │  │  MONTH   │  │  Trajectory   │ │
│  │    This Month's Spending     │  │          │  │  Below avg    │ │
│  │    ───────────────────────   │  │  vs last │  │  ████░░ 72%   │ │
│  │    Projected: $2,480         │  │  +12%    │  │               │ │
│  │                              │  │          │  │               │ │
│  └──────────────────────────────┘  └─────────┘  └───────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────┐  ┌──────────────────┐│
│  │                                         │  │                  ││
│  │       [Monthly Trend Chart]             │  │  TOP DRIVERS     ││
│  │       12-month area chart               │  │                  ││
│  │       with 3-mo rolling avg             │  │  Dining  $680    ││
│  │                                         │  │  ▲ 45%           ││
│  │                                         │  │                  ││
│  │                                         │  │  Groceries $520  ││
│  │                                         │  │  ▲ 12%           ││
│  │                                         │  │                  ││
│  │                                         │  │  Shopping  $420  ││
│  │                                         │  │  ▼ 8%            ││
│  │                                         │  │                  ││
│  └─────────────────────────────────────────┘  └──────────────────┘│
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │ BY CARD  │  │ DAILY    │  │                                  │ │
│  │          │  │ RATE     │  │     CATEGORY DONUT               │ │
│  │ ● Amex   │  │          │  │     [Recharts PieChart]          │ │
│  │   $1.2k  │  │ $76/day  │  │     with category colors        │ │
│  │ ● Citi   │  │ avg      │  │     and center stat              │ │
│  │   $800   │  │          │  │                                  │ │
│  │ ● Cap1   │  │ $89 peak │  │                                  │ │
│  │   $300   │  │ (Sat)    │  │                                  │ │
│  │          │  │          │  │                                  │ │
│  └──────────┘  └──────────┘  └──────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────┐  ┌──────────────────┐│
│  │                                         │  │                  ││
│  │  RECURRING / SUBSCRIPTIONS              │  │  TOP INSIGHT     ││
│  │                                         │  │                  ││
│  │  $450/mo total · 8 active               │  │  "Dining is      ││
│  │                                         │  │   2.3σ above     ││
│  │  Netflix   $16  ·  Spotify  $11         │  │   your average   ││
│  │  Gym       $50  ·  iCloud   $3          │  │   this month"    ││
│  │  YouTube   $14  ·  Apple    $1          │  │                  ││
│  │                                         │  │  ── severity:    ││
│  │  ⚠ 1 possibly forgotten                 │  │     HIGH         ││
│  │                                         │  │                  ││
│  └─────────────────────────────────────────┘  └──────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Grid System

The mosaic uses CSS Grid with a **12-column base grid**:

```css
display: grid;
grid-template-columns: repeat(12, 1fr);
gap: 16px; /* or 20px */
```

**Tile sizes:**

| Row | Tile | Columns | Description |
|-----|------|---------|-------------|
| 1 | Hero stat | 6 | Large hero with projected |
| 1 | This month | 2 | Compact stat comparison |
| 1 | Trajectory | 4 | Progress bar + status |
| 2 | Trend chart | 8 | Main chart, tall |
| 2 | Top drivers | 4 | Category list |
| 3 | By card | 2 | Compact card list |
| 3 | Daily rate | 2 | Mini stat |
| 3 | Category donut | 8 | Pie chart |
| 4 | Recurring | 8 | Subscription grid |
| 4 | Top insight | 4 | Featured insight card |

Container: `max-w-6xl mx-auto px-6` — wide but not full-bleed, leaving breathing room on edges.

### Key Design Elements

**Visual rhythm through tile size variation:**
- Large tiles (8-col) anchor the eye — chart and recurring section
- Medium tiles (4-6 col) provide context — hero, drivers, insight
- Small tiles (2-col) are accent pieces — card list, daily rate
- This variation prevents the "wall of same-sized cards" monotony

**Tile inner design:**
- Each tile has a distinct internal layout tailored to its content
- Hero tile: large number left-aligned with supporting stats right
- Chart tile: full-bleed chart with title tucked in top-left corner
- List tiles: tight vertical rhythm, no wasted space
- Mini stat tiles: single number, large, centered

**Arctic style:**
- Glass panels on every tile
- Background blobs positioned behind large tiles for blur effect
- Tiles have subtle inner glow (`inset_0_1px_0_rgba(255,255,255,0.05)`)
- Sky-blue accent on tile headers
- Tile borders at `border-white/[0.06]` — barely visible, felt more than seen
- Hover: tile border brightens to `border-white/[0.12]`

**Paper style:**
- White tiles with `border border-gray-200` and `shadow-sm`
- Tile headers in charcoal with small emerald accent (underline or dot)
- Paper island wrapper for the entire mosaic grid
- Hover: tile shadow deepens slightly
- Category donut uses muted, editorial-appropriate category colors (slightly desaturated vs Arctic)

### Animations
- Tiles stagger in with a diagonal reveal pattern (top-left to bottom-right, 80ms delay between tiles)
- Tile entrance: `opacity: 0, scale: 0.96, y: 8` → `opacity: 1, scale: 1, y: 0` over 400ms
- Charts animate draw when their tile appears
- Numbers count up (300ms spring)
- Donut segments animate in sequence (clockwise)
- Subtle hover lift on tiles (`translateY(-2px)` + shadow enhancement)

### Responsive Behavior
- 1280px+: Full 12-column grid as shown
- 1024–1279px: Simplify to 8-column grid, tiles redistribute
- 768–1023px: 4-column grid, tiles stack in meaningful pairs
- <768px: Single column stack, all tiles full-width

### Data Used
- `summary`: this_month, last_month, mom_change_pct, avg_monthly, vs_avg_pct, projected_month_total, by_category, by_card, daily_rate
- `monthly`: 12-month trend chart
- `forecast`: projected, trajectory, vs_average
- `anomalies`: top 3 category drivers
- `recurring`: subscription grid (top 6), monthly total, active count, forgotten alerts
- `insights`: top insight (featured)
- `merchants`: top 3 (optional — could replace daily rate tile)
- `cards`: for card colors in by-card tile
- `daily`: last 7 days for daily rate calculation

---

## Layout 5: Pulse

**File:** `frontend/src/components/dashboards/layouts/pulse.tsx`

**Philosophy:** A vertically stacked card-based layout where each "pulse card" is a self-contained metric or insight. Think of it like a mobile-first feed of your financial health — each card is a discrete heartbeat of information. Inspired by Apple Health summaries, Spotify Wrapped cards, and notification-center widgets. The cards have generous padding, distinct visual identities, and can be mentally processed one at a time as you scroll.

### Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SPENDING PULSE                                          │  │
│  │                                                          │  │
│  │          $2,345.67                                       │  │
│  │          this month                                      │  │
│  │                                                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │ vs last  │  │ vs avg   │  │ projected│               │  │
│  │  │ +12%     │  │ -6%      │  │ $2,480   │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TREND                                                   │  │
│  │                                                          │  │
│  │  [Full-width area chart — 12 months]                     │  │
│  │  with rolling average overlay                            │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────┐  ┌────────────────────────┐   │
│  │  CATEGORIES                │  │  CARDS                  │   │
│  │                            │  │                         │   │
│  │  ● Dining     $680  ▲45%  │  │  ● Amex    $1,200      │   │
│  │  ● Groceries  $520  ▲12%  │  │  ● Citi    $800        │   │
│  │  ● Shopping   $420  ▼8%   │  │  ● Cap1    $345        │   │
│  │  ● Gas        $180  ─     │  │                         │   │
│  │  ● Subs       $120  ─     │  │                         │   │
│  └────────────────────────────┘  └────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ALERT                                                   │  │
│  │                                                          │  │
│  │  ⚠ Dining is 2.3σ above your average this month         │  │
│  │    $680 spent vs $470 typical  ·  severity: HIGH         │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SUBSCRIPTIONS                                           │  │
│  │                                                          │  │
│  │  $450/mo  ·  8 active  ·  $5,400/yr                     │  │
│  │                                                          │  │
│  │  Netflix $16  ·  Spotify $11  ·  Gym $50  ·  +5 more    │  │
│  │                                                          │  │
│  │  ⚠ 1 potentially forgotten subscription                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INSIGHT                                                 │  │
│  │                                                          │  │
│  │  "Your weekend spending is 85% higher than weekdays.     │  │
│  │   Saturday averages $89 — your most expensive day."      │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Layout Philosophy

- **Medium column:** `max-w-4xl mx-auto` — wider than Zen, narrower than Command Deck
- **Card-first:** Every section is a distinct, well-padded card with its own header label
- **Mixed widths:** Most cards are full-width, but some pair side-by-side (categories + cards) for visual variety
- **Vertical scroll:** Designed to be scanned top-to-bottom like a feed
- **Card labels:** Each card has a small uppercase label (e.g., "SPENDING PULSE", "TREND", "ALERT") in the theme's muted text color, providing scannable anchors
- **No prose:** Unlike Daily Journal, Pulse uses structured data — lists, numbers, badges — not paragraphs

### Card Types

**Hero Card (Spending Pulse):**
- Large hero number centered
- Three mini-stat pills below: vs last month, vs average, projected
- Each pill shows direction (up/down arrow) and is color-coded (danger for overspend, success for under)

**Trend Card:**
- Full-width area chart with no surrounding chrome
- Chart fills the card edge-to-edge (minus card padding)
- Rolling average as dashed overlay line

**Split Cards (Categories + Cards):**
- Side-by-side on desktop, stacked on mobile
- `grid grid-cols-2 gap-4` for the pair
- Categories: sorted by spend, with trend arrows and category color dots
- Cards: sorted by spend, with card color dots

**Alert Card:**
- Only renders if anomalies exist
- Prominent warning styling — in Arctic: sky-blue border-left accent. In Paper: emerald/danger left border
- Shows the highest-severity anomaly with context

**Subscriptions Card:**
- Summary line (total/count/annual) at top
- Inline list of top subscriptions with amounts
- Forgotten subscription warning if applicable

**Insight Card:**
- Displays the top insight in quote-style formatting
- Larger text than other cards, styled as a pull-quote
- Uses the display font for impact

### Arctic Style Specifics
- Cards are glass panels with backdrop blur
- Background blobs scattered between cards for glassmorphism depth
- Card labels in sky-blue accent
- Alert card has a sky-blue left border accent (4px)
- Hover: glass panel border brightens

### Paper Style Specifics
- Cards are white with `border border-gray-200 shadow-sm`
- Card labels in charcoal, small emerald dot before each label
- Alert card has an emerald (or danger-red for critical) left border accent
- Hover: shadow deepens slightly
- Paper island wraps the full card stack

### Animations
- Cards stagger in from bottom as they enter viewport (100ms delay between cards)
- Card entrance: `opacity: 0, y: 16` → `opacity: 1, y: 0` over 400ms
- Hero number counts up on mount (spring, 500ms)
- Chart draws with standard Recharts animation (1s)
- Mini-stat pills in hero card pop in with slight scale (0.9 → 1.0) staggered
- Alert card has a subtle pulse animation on the left border accent (1 cycle, 2s)

### Responsive Behavior
- 1024px+: `max-w-4xl`, split cards side-by-side
- 768–1023px: `max-w-3xl`, split cards still side-by-side
- <768px: Full-width, all cards stack vertically, split cards become single-column

### Data Used
- `summary`: this_month, last_month, mom_change_pct, avg_monthly, vs_avg_pct, projected_month_total, by_category, by_card
- `monthly`: 12-month trend chart
- `forecast`: projected, trajectory, vs_average, vs_last_month
- `anomalies`: highest severity for alert card
- `recurring`: subscription summary and list
- `insights`: top insight for quote card
- `cards`: for card colors

---

## Color Palettes — Complete Reference

### Arctic Glass (Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0A0A0F` | Page background |
| Surface | `rgba(255, 255, 255, 0.03)` | Glass panel fill |
| Border | `rgba(255, 255, 255, 0.06)` | Panel borders |
| Text | `#FFFFFF` | Primary text |
| Text muted | `rgba(125, 211, 252, 0.35)` | Labels, secondary text |
| Accent | `#7DD3FC` | Headings, highlights, chart stroke |
| Accent bright | `#38BDF8` | Active states, emphasis |
| Accent muted | `rgba(125, 211, 252, 0.15)` | Badge backgrounds, hover states |
| Danger | `#F87171` | Negative trends, overspend |
| Success | `#34D399` | Positive trends, under budget |
| Chart gradient start | `rgba(125, 211, 252, 0.20)` | Chart area fill top |
| Chart gradient end | `transparent` | Chart area fill bottom |
| Glass blur blob | `rgba(125, 211, 252, 0.08)` | Decorative background blobs |
| Hover border | `rgba(255, 255, 255, 0.12)` | Panel border on hover |

**Fonts:** Outfit (700) for display, DM Sans (400/500) for body

### Paper Light (Light Mode)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FAFAF8` | Page background (paper island) |
| Surface | `#FFFFFF` | Card/panel fill |
| Border | `#E5E7EB` | Panel borders |
| Text | `#1A1A1A` | Primary text |
| Text muted | `#9CA3AF` | Labels, secondary text (use `#6B7280` for small text) |
| Accent | `#059669` | Headings, highlights, positive trends |
| Accent bright | `#047857` | Active states, emphasis |
| Accent muted | `rgba(5, 150, 105, 0.08)` | Badge backgrounds, hover states |
| Danger | `#DC2626` | Negative trends, overspend |
| Success | `#059669` | Same as accent — emerald for positive |
| Chart stroke | `#1A1A1A` | Charcoal chart line (understated) |
| Chart gradient start | `rgba(5, 150, 105, 0.08)` | Chart area fill top |
| Chart gradient end | `transparent` | Chart area fill bottom |
| Card shadow | `0 1px 3px rgba(0, 0, 0, 0.08)` | Panel elevation |
| Hover shadow | `0 4px 12px rgba(0, 0, 0, 0.1)` | Panel elevation on hover |

**Fonts:** Fraunces (700) for display, Source Serif 4 (400/600) for body

### Shared Across Both Themes

| Token | Value | Usage |
|-------|-------|-------|
| Category colors | Per `CATEGORY_COLORS` in constants.ts | Chart segments, badges |
| Card colors | Per card's `color` field from API | Card indicators, chart segments |
| Financial data font | `font-mono` (JetBrains Mono) | Dollar amounts, numbers (NOT hero) |
| Hero number font | Theme's `displayFont` | Large hero number only |

---

## Cross-Cutting Design Notes

### Financial Data Typography (All Layouts)
Dollar amounts and numeric data use `font-mono` (JetBrains Mono) — always. The hero number is the ONE exception: it uses the theme's display font (Outfit for Arctic, Fraunces for Paper). This rule applies in every layout regardless of style.

### Conditional Rendering (All Layouts)
Every section that displays API data must conditionally render. If `anomalies.length === 0`, don't show the drivers section. If `recurring === null`, don't show subscriptions. If `insights?.[0]` is undefined, don't show the insight panel. Gracefully degrade — an empty layout with only the hero number and chart is better than one with empty sections or loading spinners.

### Paper Island Technique
When Paper Light is active, the entire layout content area becomes a light-mode sheet:
```tsx
<div style={{
  backgroundColor: '#FAFAF8',
  color: '#1A1A1A',
  borderRadius: '24px 24px 0 0',
  boxShadow: '0 0 80px rgba(0,0,0,0.3)',
  minHeight: '100vh',
}}>
  {/* Layout content */}
</div>
```
The sidebar and navigator remain dark. Only the main content transforms.

### Arctic Glassmorphism Blobs
When Arctic Glass is active, layouts that use glass panels MUST include decorative background blobs. `backdrop-blur` on `#0A0A0F` is invisible without them. Place 2–3 `<div>` elements with soft radial gradients (`rgba(125, 211, 252, 0.08)`) and `filter: blur(80px)`, positioned absolutely behind the glass panels.

### Chart Tooltip Consistency
Both themes need custom tooltip styling:
- **Arctic:** `{ backgroundColor: 'rgba(20, 20, 25, 0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(8px)' }`
- **Paper:** `{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }`

### Recharts v3 Tooltip Formatter
Recharts 3.x `Tooltip` formatter param type is `number | undefined` — use `(v?: number) => ...` to avoid TypeScript errors.

### Contrast and Readability
- **Arctic:** Muted text at minimum 30% opacity. `rgba(125, 211, 252, 0.35)` is the floor.
- **Paper:** `#9CA3AF` passes WCAG AA for large text only. For small body text (<14px), use `#6B7280` instead.

---

## Detailed Tasks

### Task 1: Create Theme Provider

**File:** `frontend/src/components/theme-provider.tsx`

- React context with Arctic and Paper theme configs
- Persists style preference in `localStorage` (key: `ledgr-theme-style`)
- Defaults to `"arctic"` on first load
- Exports `ThemeProvider`, `useTheme()` hook

### Task 2: Create Themed Components

**File:** `frontend/src/components/dashboards/themed-components.tsx`

- `ThemedPanel` — glass panel (arctic) or white card (paper)
- `ThemedChart` — wrapper that configures Recharts colors per theme
- `ThemedBackground` — background blobs (arctic) or paper island (paper)
- `ThemedHeading` — display font heading
- `ThemedText` — body font text
- `ThemedDivider` — section divider (dashed sky-blue for arctic, solid gray for paper)

### Task 3: Update Navigator

**File:** `frontend/src/components/dashboards/design-trial-navigator.tsx`

- Replace 5 design buttons with 5 layout buttons
- Add Arctic/Paper style toggle
- Update props to `currentLayout: 1 | 2 | 3 | 4 | 5`
- Style toggle reads/writes theme via `useTheme()`

### Task 4: Build Layout 1 — Zen Flow

**File:** `frontend/src/components/dashboards/layouts/zen-flow.tsx`

- Refactor current arctic-glass.tsx + paper-light.tsx into a single theme-aware component
- Uses `useTheme()` for all style decisions
- Layout structure unchanged from 04_01
- Delete redundant code, use ThemedPanel, ThemedChart, etc.

### Task 5: Build Layout 2 — Command Deck

**File:** `frontend/src/components/dashboards/layouts/command-deck.tsx`

- Dense grid layout as specified
- All tiles use ThemedPanel
- Charts use ThemedChart for consistent styling
- Responsive grid breakpoints at 1440/1024/768
- No scrolling on desktop — everything above the fold

### Task 6: Build Layout 3 — Daily Journal

**File:** `frontend/src/components/dashboards/layouts/daily-journal.tsx`

- Prose-first narrative layout
- Dynamic text generation from data
- Inline charts as illustrations
- Narrow `max-w-2xl` reading column
- Section-by-section scroll reveal

### Task 7: Build Layout 4 — Mosaic

**File:** `frontend/src/components/dashboards/layouts/mosaic.tsx`

- 12-column CSS Grid bento layout
- Asymmetric tile sizes as specified
- Diagonal stagger animation on tile entrance
- Category donut chart with center stat
- Responsive tile redistribution

### Task 8: Build Layout 5 — Pulse

**File:** `frontend/src/components/dashboards/layouts/pulse.tsx`

- Card-stack feed layout as specified
- Each section is a distinct ThemedPanel card with uppercase label
- Split cards (categories + cards) side-by-side on desktop
- Alert card conditionally rendered with accent left border
- Insight card uses display font for pull-quote effect
- Responsive stacking on mobile

### Task 9: Update Route Pages

- `/1/page.tsx` — imports ZenFlow layout
- `/2/page.tsx` — imports CommandDeck layout
- `/3/page.tsx` — imports DailyJournal layout
- `/4/page.tsx` — imports Mosaic layout
- `/5/page.tsx` — imports Pulse layout
- Update root `page.tsx` (still redirects to `/1`)
- Each page wraps content in `<ThemeProvider>`
- Pass full `DashboardLayoutProps` to each layout

### Task 10: Update Sidebar

**File:** `frontend/src/components/sidebar.tsx`

- Update Design Trials section to 5 links with new layout names
- Update labels to match new layout names

### Task 11: Clean Up Old Files

- Keep `arctic-glass.tsx` and `paper-light.tsx` as reference (or extract their style constants into `themed-components.tsx` and then delete)
- Delete `zen-minimalist.tsx`, `warm-ledger.tsx`, `neon-dusk.tsx` (no longer used)

---

## Verification

1. `bun dev` — compiles without errors
2. `npx tsc --noEmit` — no TypeScript errors
3. Browser: `/1` shows Zen Flow layout with Arctic style by default
4. Browser: Toggle to Paper — layout remains the same, style changes to light mode
5. Browser: `/2` shows Command Deck with dense grid — all tiles visible without scrolling
6. Browser: `/3` shows Daily Journal with prose narrative — scroll reveals sections
7. Browser: `/4` shows Mosaic with asymmetric bento grid
8. Browser: `/5` shows Pulse with card-stack feed layout
9. All 5 layouts work in both Arctic and Paper styles
10. Style toggle persists across page navigation (localStorage)
11. Navigator shows 5 layout buttons + style toggle + test data toggle
12. Test Data toggle works on all 5 layouts in both styles
13. Paper style creates proper "paper island" with dark sidebar contrast
14. Arctic style has visible glassmorphism (background blobs present)
15. Charts use correct colors per theme (sky-blue for arctic, charcoal/emerald for paper)
16. Financial numbers use `font-mono` everywhere except hero numbers
17. Responsive: Command Deck, Mosaic, and Pulse gracefully collapse on smaller screens
18. No Tailwind/CSS conflicts between layouts (unique gradient IDs, scoped styles)
19. Sidebar shows 5 design trial links with updated names
20. Root `/` still redirects to `/1`
