# Prompt 04_01: Zen Layout — 5 Design Style Variants

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

---

## Goal

Replace the existing 5 dashboard design trials with **5 new style variants** that all share the **Zen Minimalist layout philosophy** — generous whitespace, centered single-column content, a hero number at top, a single beautiful chart, progressive disclosure via scrolling, and maximum readability. The **layout structure** stays the same across all 5; what changes is the **visual design language**: typography, color palette, textures, motion style, and overall aesthetic personality.

Design 1 is the existing Zen Minimalist (kept as-is or with minimal cleanup). Designs 2–5 are fresh, distinctive visual treatments applied to the same layout skeleton.

## Prerequisites

- Prompt 04 completed: all dashboard components, hooks, types, and routes exist
- The `useDashboardData()` hook and all types remain unchanged
- The `DesignTrialNavigator` component exists and will be updated with new names

## What Changes

- `frontend/src/components/dashboards/zen-minimalist.tsx` — kept as Design 1 (minor cleanup only if needed)
- `frontend/src/components/dashboards/command-center.tsx` — **replaced** with Design 2
- `frontend/src/components/dashboards/story-mode.tsx` — **replaced** with Design 3
- `frontend/src/components/dashboards/action-dashboard.tsx` — **replaced** with Design 4
- `frontend/src/components/dashboards/visual-first.tsx` — **replaced** with Design 5
- `frontend/src/components/dashboards/design-trial-navigator.tsx` — updated with new trial names
- `frontend/src/app/1/page.tsx` through `frontend/src/app/5/page.tsx` — updated imports and prop passing
- `frontend/src/app/globals.css` — add any new CSS variables, font imports, or background effects needed
- `frontend/src/app/layout.tsx` — add any new Google Font imports needed

## Fonts

Each design uses a **different** font pairing. Load all fonts via `next/font/google` in `layout.tsx` and expose them as CSS variables. Designs apply their font via a wrapper className.

**CRITICAL:** Do NOT default to Inter, Roboto, Space Grotesk, or other overused fonts. Every design must have a distinctive typographic identity.

---

## Shared Layout Skeleton (All 5 Designs)

Every design follows this exact structural layout. Only the visual treatment differs.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        [Label]                                  │
│                                                                 │
│                     [Hero Number]                               │
│                                                                 │
│                   [Comparison Line 1]                           │
│                   [Comparison Line 2]                           │
│                                                                 │
│     ┌───────────────────────────────────────────────────┐       │
│     │                                                   │       │
│     │         [Large area/line chart — 12 months]       │       │
│     │                                                   │       │
│     └───────────────────────────────────────────────────┘       │
│                                                                 │
│                    [Scroll indicator]                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   [Section: Top Drivers]                         │
│                                                                 │
│                    Category1: $XXX (+YY%)                        │
│                    Category2: $XXX (+YY%)                        │
│                    Category3: $XXX (-YY%)                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   [Section: Recurring]                           │
│                                                                 │
│                       $XXX / month                              │
│                    N active subscriptions                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   [Section: Top Insight]                         │
│                                                                 │
│                    [Insight message]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Layout constants (all 5 designs):**
- Container: `max-w-3xl mx-auto`
- Hero section: `py-16 text-center`
- Chart: `ResponsiveContainer width="100%" height={280}`
- Scroll sections: `py-12 text-center`
- Inter-section spacing: generous, no visual clutter

**Data used (all 5 designs — same props interface):**
```typescript
interface ZenVariantProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}
```

---

## Design 1: Zen Minimalist (Current)

**File:** `frontend/src/components/dashboards/zen-minimalist.tsx`

**Status:** Keep as-is. This is the baseline. No changes needed.

**Aesthetic:** Monochrome white-on-void. Ultra-minimal. White text at varying opacities on the `#0A0A0F` background. No color accents. The chart uses a white-to-transparent gradient. Breathing scale animation on the hero number. Framer Motion `whileInView` reveals on scroll.

**Typography:** JetBrains Mono for the hero number, system sans for labels.

**Navigator label:** "Zen Minimalist"

---

## Design 2: Warm Ledger

**File:** `frontend/src/components/dashboards/warm-ledger.tsx` (replaces `command-center.tsx`)

**Aesthetic:** Warm, analog, old-world bookkeeping. Think aged paper in a dark room — rich amber and sepia tones against the dark background. A single warm accent color dominates. Feels like a beautifully typeset financial ledger from a private bank.

**Typography:**
- Hero number: **Cormorant Garamond** (weight 600, `font-serif`) — elegant, high-contrast serif
- Labels/body: **Libre Baskerville** (weight 400) — readable serif with warmth
- CSS variable: `--font-cormorant`, `--font-baskerville`

**Color Palette:**
- Primary accent: `#D4A574` (warm copper)
- Secondary: `#8B7355` (aged bronze)
- Muted text: `rgba(212, 165, 116, 0.4)` (copper at 40%)
- Chart gradient: copper to transparent
- Subtle background effect: very faint radial gradient of warm amber from center (`rgba(212, 165, 116, 0.03)`)

**Chart Style:**
- `<AreaChart>` with copper stroke (`#D4A574`), gradient fill from copper 15% opacity to transparent
- XAxis ticks in muted copper
- Tooltip with dark surface background and copper text
- Dashed gridlines at very low opacity (`rgba(212, 165, 116, 0.08)`)

**Scroll Indicator:** `─── continue below ───` in a decorative serif style with `letter-spacing: 0.15em`

**Section Dividers:** Thin horizontal rule in copper at 10% opacity between scroll sections, centered with `max-w-xs mx-auto`

**Motion:**
- Hero number fades in with a slow upward drift (1s duration, no breathing — stately, not playful)
- Chart draws with a 2s Recharts animation (slow, deliberate)
- Scroll sections reveal with a gentle 0.8s fade + 15px upward slide
- No looping animations — everything is one-shot, dignified

**Background Texture:** Add a very subtle noise texture via CSS — a repeating tiny dot pattern at 2% opacity to add tactile warmth. Implement with a CSS `background-image` using an inline SVG data URL on the outer container. This is NOT optional — it's what sells the analog feel.

**Design Notes (must address during implementation):**
- **Copper vs Amex gold:** `#D4A574` is visually close to the Amex card color `#C5A44E`. This is intentional — the warm ledger aesthetic leans into gold/amber — but be aware that if Amex data is present, the chart and card data should still use the actual Amex color from the cards API, NOT the design's copper accent. The copper accent is for UI chrome (labels, dividers, scroll text) only. Financial data colors come from the card/category constants as always.
- **Hero number font-variant:** Cormorant Garamond at weight 600 can look thin at `text-6xl`. Test at the actual display size — if it feels fragile, bump to weight 700 or increase to `text-7xl` to let the serifs breathe.
- **Section text font:** The "continue below" scroll indicator and all section headers (e.g., "What's driving this?") should use Libre Baskerville, NOT Cormorant. Cormorant is reserved for the hero number only. This keeps the type hierarchy clean.
- **Conditional sections:** Like the existing Zen Minimalist, each below-fold section (drivers, recurring, insight) must be conditionally rendered — only show if the data exists (e.g., `anomalies.length > 0`, `recurring !== null && recurring.length > 0`, `insights?.[0]`).

---

## Design 3: Arctic Glass

**File:** `frontend/src/components/dashboards/arctic-glass.tsx` (replaces `story-mode.tsx`)

**Aesthetic:** Cool, crystalline, and modern. Frosted glass panels floating over a deep navy void. Cool blues and cyan accents with sharp, clean typography. Inspired by Nordic design — functional beauty with icy precision.

**Typography:**
- Hero number: **Outfit** (weight 700) — geometric, modern, extremely clean
- Labels/body: **DM Sans** (weight 400/500) — friendly geometric sans
- CSS variable: `--font-outfit`, `--font-dm-sans`

**Color Palette:**
- Primary accent: `#7DD3FC` (sky blue / `sky-300`)
- Secondary: `#38BDF8` (brighter sky for emphasis)
- Muted text: `rgba(125, 211, 252, 0.35)`
- Chart gradient: sky blue to transparent
- Background effect: very subtle radial gradient from deep navy center (`rgba(56, 189, 248, 0.04)`)

**Glassmorphism Panels:**
- Each scroll section wrapped in a glass panel: `bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl px-8 py-10`
- Panels have a subtle inner glow: `shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`
- The hero section does NOT have a panel — it floats free. Only the below-fold sections get panels.

**Chart Style:**
- `<AreaChart>` with sky-blue stroke, gradient fill from `#7DD3FC` at 20% to transparent
- Clean, thin axis lines at very low opacity
- Tooltip with glass panel styling matching the section panels

**Scroll Indicator:** A small downward chevron icon (`▾`) pulsing gently instead of text, in muted sky blue

**Motion:**
- Hero number slides in from below with a spring ease (`type: "spring", stiffness: 80, damping: 15`)
- Glass panels fade in with a slight scale-up (0.97 → 1.0) as they enter the viewport
- Chart area fills with a smooth 1.5s draw
- The chevron scroll indicator bobs up and down in a 2s infinite loop (`y: [0, 6, 0]`)

**Design Notes (must address during implementation):**
- **CRITICAL — Glassmorphism needs something to blur:** `backdrop-blur` on a solid `#0A0A0F` background produces NO visible effect — it just looks like a slightly tinted panel. To make glassmorphism actually work, you MUST add blurred decorative background shapes behind the glass panels. Add 2-3 absolutely-positioned `<div>` blobs with soft radial gradients (sky-blue at ~8% opacity, spread across the page at different positions) and apply `filter: blur(80px)` to them. Place them as siblings before the content, inside a `relative` wrapper. The glass panels then blur over these blobs, creating the actual frosted-glass illusion. Without this, the "glass" just looks like a semi-transparent box.
- **Chevron rendering:** Do NOT use the Unicode `▾` character — it renders inconsistently across platforms and fonts. Instead, use an inline SVG chevron (a simple `<svg>` with a downward-pointing path, 16x16, stroke-only, in muted sky blue). Wrap it in `<motion.div>` for the bob animation.
- **DM Sans convergence risk:** DM Sans is becoming common in AI-generated designs. It works here because the Arctic aesthetic needs a clean geometric sans, and DM Sans at weight 400 pairs well with Outfit's bolder weight. But if the implementer wants to push distinctiveness further, **Figtree** or **General Sans** (if available on Google Fonts) could be alternatives. Stick with DM Sans for now — it's the right functional choice.
- **Chart container:** The chart sits in the above-fold hero area and should float free (no glass panel). Only the below-fold scroll sections get the glass treatment.
- **Conditional sections:** Same as Design 2 — each section conditionally renders only if data exists.

---

## Design 4: Neon Dusk

**File:** `frontend/src/components/dashboards/neon-dusk.tsx` (replaces `action-dashboard.tsx`)

**Aesthetic:** Moody, cinematic, late-night dashboard energy. Think synthwave sunset — deep purples and warm magentas against the void, with a single electric accent. Not retro-80s-cliche — modern and restrained, like the glow of a city at dusk seen from a high-rise.

**Typography:**
- Hero number: **Syne** (weight 700) — bold, geometric, slightly unconventional letterforms
- Labels/body: **Lexend** (weight 300/400) — designed for readability, airy and modern
- CSS variable: `--font-syne`, `--font-lexend`

**Color Palette:**
- Primary accent: `#F472B6` (pink-400 — warm magenta/rose)
- Secondary: `#A78BFA` (violet-400 — for subtle secondary elements)
- Muted text: `rgba(244, 114, 182, 0.35)`
- Chart gradient: magenta to violet blend, both at low opacity
- Background effect: diagonal gradient from bottom-left (`rgba(244, 114, 182, 0.03)`) to top-right (`rgba(167, 139, 250, 0.03)`), creating a very faint warm-to-cool sweep

**Chart Style:**
- `<AreaChart>` with magenta stroke (`#F472B6`), gradient fill using a `<linearGradient>` from magenta 20% to violet 5% to transparent
- XAxis ticks in muted magenta
- A secondary thin reference line on the chart showing average monthly spend in violet at 30% opacity (Recharts `<ReferenceLine>`)

**Scroll Indicator:** `· · ·` three dots that pulse sequentially (like a loading animation but slower, 3s cycle)

**Section Styling:**
- Section headers have a faint magenta glow: `text-shadow: 0 0 30px rgba(244, 114, 182, 0.15)`
- Category amounts in the "drivers" section use the violet accent for the percentage change
- The recurring total uses a slightly larger size than the zen original for emphasis

**Motion:**
- Hero number fades in with a slight blur-to-sharp transition (Framer Motion `filter` from `blur(8px)` to `blur(0px)` over 1s). Add `style={{ willChange: 'filter' }}` to avoid repaint jank on the blur animation.
- Chart stroke glows subtly with a CSS animation: `filter: drop-shadow(0 0 6px rgba(244, 114, 182, 0.3))` that pulses (2s infinite ease-in-out, alternating between 0.15 and 0.35 opacity)
- Scroll sections stagger in with 0.15s delays between each
- Numbers in the drivers section count up from 0 using Framer Motion's `useSpring` + `useTransform` for smooth easing (spring with `stiffness: 50, damping: 20`), NOT raw `requestAnimationFrame` which produces jittery results. Format the animated value with `formatCurrency` via `useMotionValueEvent` or a `motion.span` with `useTransform`.

**Design Notes (must address during implementation):**
- **Purple/pink cliché awareness:** The aesthetics prompt warns against "purple gradients." This design uses pink-400 + violet-400, which is adjacent to that territory. The key to avoiding the cliché: (1) magenta/rose is the DOMINANT color, violet is barely present — only on the chart's secondary gradient stop and the percentage text; (2) the application is restrained — no gradient backgrounds, no gradient text, no glowing borders everywhere; (3) the dark void background and generous whitespace prevent it from feeling like a generic SaaS landing page. If it starts looking like a Stripe dashboard, pull back on the violet entirely and go pure rose monochrome.
- **Three-dot scroll indicator timing:** The 3s cycle means: dot 1 pulses bright at 0s, dot 2 at 1s, dot 3 at 2s, then the cycle repeats. Each dot fades from 0.2 → 1.0 → 0.2 opacity over ~0.8s. Implement with three `<motion.span>` elements, each with `animate={{ opacity: [0.2, 1, 0.2] }}` and `transition={{ duration: 2.4, repeat: Infinity, delay: N * 0.8 }}`.
- **ReferenceLine label:** The average reference line should have a small label at its right end: "avg" in muted violet, `fontSize: 10`. Use Recharts `<ReferenceLine label={{ value: 'avg', position: 'right', fill: 'rgba(167, 139, 250, 0.5)', fontSize: 10 }} />`.
- **Conditional sections:** Same as other designs — conditionally render each section based on data availability.

---

## Design 5: Paper Light

**File:** `frontend/src/components/dashboards/paper-light.tsx` (replaces `visual-first.tsx`)

**Aesthetic:** A bold departure — **light mode**. Crisp white/off-white background with deep charcoal text and a single muted accent color. Inspired by premium print design: think Monocle magazine, Dieter Rams, or a beautifully typeset annual report. Proves that dark mode isn't the only way to be elegant.

**Typography:**
- Hero number: **Fraunces** (weight 700, optical size 72) — a beautiful variable serif with personality, slightly quirky
- Labels/body: **Source Serif 4** (weight 400) — refined, readable serif for body text
- CSS variable: `--font-fraunces`, `--font-source-serif`

**Color Palette (LIGHT MODE):**
- Background: `#FAFAF8` (warm off-white)
- Surface: `#FFFFFF` (pure white for cards/sections)
- Text primary: `#1A1A1A` (near-black)
- Text muted: `#9CA3AF` (gray-400)
- Primary accent: `#059669` (emerald-600 — a single, decisive green for positive/accent)
- Danger/negative: `#DC2626` (red-600)
- Chart fill: emerald at 8% opacity
- Chart stroke: `#1A1A1A` (charcoal, not the accent — the chart is understated)
- Border: `#E5E7EB` (gray-200)

**Implementation — Light Mode Wrapper:**
- Wrap the entire component in a `<div>` with explicit light-mode overrides:
  ```
  className="mx-auto max-w-3xl"
  style={{
    backgroundColor: '#FAFAF8',
    color: '#1A1A1A',
    borderRadius: '24px',
    margin: '0 auto',
    padding: '0 24px'
  }}
  ```
- This creates a "paper island" within the dark app shell — the sidebar and navigator stay dark, but the content area becomes a light sheet
- Add a subtle box shadow on the outer container: `shadow-[0_0_80px_rgba(0,0,0,0.3)]` to make it float
- Extend the light background to fill the viewport height with `min-h-screen`

**Chart Style:**
- `<AreaChart>` with charcoal stroke (`#1A1A1A`, thin 1.5px), emerald gradient fill at very low opacity
- XAxis ticks in gray-400
- Tooltip with white background, charcoal text, subtle border
- Clean, almost invisible grid — let the data shape speak

**Scroll Indicator:** A thin horizontal rule (`<hr>`) with the word "details" in small caps centered on it (CSS technique: background color on the text span to "cut through" the line)

**Section Styling:**
- Each section below the fold gets a top border of `1px solid #E5E7EB` instead of open space
- Category percentages: green if trending down (good), red if trending up (bad) — using the accent/danger colors
- The overall feel is restrained, confident, editorial

**Motion:**
- Minimal animation — this design trusts its typography and layout over motion
- Hero number: simple opacity 0→1 over 0.6s, no scale/slide (print doesn't move)
- Chart: standard 1s Recharts draw animation
- Scroll sections: 0.4s fade-in with `whileInView`, no vertical movement
- The restraint IS the design statement

**Design Notes (must address during implementation):**
- **Hero number color:** The hero number should be `#1A1A1A` (charcoal), NOT the emerald accent. The emerald accent is reserved for positive trend indicators and the single accent moment (e.g., the "below average" text or a subtle accent line). The hero number is pure typography — let Fraunces do the work.
- **Paper island border radius:** The `borderRadius: 24px` on the outer container will clip the top of the hero section if padding is too tight. Ensure the hero section has at least `pt-20` (more than the standard `py-16`) to give the rounded top room to breathe. At the bottom, the container should NOT have bottom border-radius if it extends past the viewport — use `borderRadius: '24px 24px 0 0'` if the container is taller than one screen, or keep full rounding if content fits in viewport.
- **Full text color override:** Since the app body has `color: #ffffff`, EVERY text element inside Paper Light must explicitly set dark text colors. Do NOT rely on inheritance — set `color` on the outer wrapper AND on every child that uses `className` text utilities. Use a CSS class approach: define a `.paper-light` class in globals.css that sets `color: #1A1A1A` and use `[&_*]:text-[#1A1A1A]` or similar. Better yet, use the inline `style={{ color: '#1A1A1A' }}` on the wrapper and ensure no Tailwind `text-white` classes leak in from shared components.
- **Shared components in light mode:** If any shared UI components (Skeleton, EmptyState) are used inside Paper Light, they will have dark-mode styling baked in. The page wrapper should handle this by NOT using shared components inside the light island, or by passing variant props if supported.
- **Conditional sections:** Same as other designs — conditionally render.
- **Chart axis and tooltip:** Remember the Recharts tooltip must be completely restyled for light mode: `contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#1A1A1A' }}`. The XAxis/YAxis ticks should use `fill: '#9CA3AF'` (gray-400).

---

## Design Comparison Reference

| Aspect | 1: Zen Minimalist | 2: Warm Ledger | 3: Arctic Glass | 4: Neon Dusk | 5: Paper Light |
|--------|-------------------|----------------|-----------------|--------------|----------------|
| **Theme** | Dark, monochrome | Dark, warm amber | Dark, icy blue | Dark, magenta/violet | Light, editorial |
| **Mood** | Calm void | Old-world elegance | Nordic precision | Cinematic dusk | Print confidence |
| **Font Style** | Mono + Sans | Serif + Serif | Geometric Sans | Bold Geo + Airy | Quirky Serif + Classic |
| **Accent Color** | White (no accent) | Copper #D4A574 | Sky #7DD3FC | Rose #F472B6 | Emerald #059669 |
| **Motion** | Breathing pulse | Slow, stately | Spring + glass | Blur + glow | Minimal, print-like |
| **Special Feature** | Radical simplicity | Warm texture/noise | Glass panels | Glow effects | Light mode island |

---

## Cross-Cutting Design Notes (Apply to ALL Designs)

### Font Loading Performance
Loading 8 additional Google Font families (each with multiple weights) is expensive. Every font declaration MUST include `display: "swap"` in the `next/font/google` options to prevent invisible text during load. Example:
```typescript
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cormorant", display: "swap" });
```
Also: only load the weights each design actually uses. The Task 1 font declarations should be trimmed to the minimum needed weights.

### Hardcoded Hex Values — Exception Policy
The Ledgr design system says "never hardcode hex in components." These 5 designs intentionally use custom color palettes that aren't in the Tailwind theme. The approach: **define each design's colors as CSS custom properties on the component's outer wrapper element via inline `style`**, then reference them throughout. This keeps colors centralized per-component while acknowledging they aren't global tokens. Example for Warm Ledger:
```tsx
<div style={{
  '--warm-accent': '#D4A574',
  '--warm-muted': 'rgba(212, 165, 116, 0.4)',
  '--warm-subtle': 'rgba(212, 165, 116, 0.08)',
} as React.CSSProperties}>
```
Then use `style={{ color: 'var(--warm-accent)' }}` throughout. This is cleaner than scattering raw hex values and makes palette tweaks trivial.

### Contrast and Readability
Muted text colors must remain readable against the dark background. Minimum guideline:
- **Dark designs (1–4):** muted text should be at least 30% opacity white or equivalent. The copper-at-40%, sky-at-35%, magenta-at-35% values specified above are acceptable but are the floor — do not go lower.
- **Light design (5):** muted text `#9CA3AF` on `#FAFAF8` passes WCAG AA for large text but not small text. For small body text (under 14px), use `#6B7280` (gray-500) instead.

### Financial Data Typography
Across ALL 5 designs, regardless of the body/display font, **dollar amounts and numeric financial data must still use `font-mono` (JetBrains Mono)**. The design-specific fonts are for labels, headers, section titles, and non-numeric text. The hero number is the ONE exception — it uses the design's display font for maximum visual impact. But inline amounts in the drivers section, recurring totals, etc. should use `font-mono` for tabular alignment and the "data" feel.

### Props Interface Consistency
The existing `ZenMinimalist` component defines its own `ZenMinimalistProps` interface internally. New components should define their own similarly-named interface (e.g., `WarmLedgerProps`) with the exact same shape. Do NOT import `ZenMinimalistProps` from the zen component — keep each component self-contained. The shape is:
```typescript
interface WarmLedgerProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}
```

---

## Detailed Tasks

### Task 1: Add Google Fonts to Layout

**File:** `frontend/src/app/layout.tsx`

Import the following fonts via `next/font/google` and expose them as CSS variables on the `<body>`:

```typescript
import { Inter, JetBrains_Mono, Cormorant_Garamond, Libre_Baskerville, Outfit, DM_Sans, Syne, Lexend, Fraunces, Source_Serif_4 } from "next/font/google";

// Design 2: Warm Ledger
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cormorant", display: "swap" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-baskerville", display: "swap" });
// Design 3: Arctic Glass
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-outfit", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans", display: "swap" });
// Design 4: Neon Dusk
const syne = Syne({ subsets: ["latin"], weight: ["700"], variable: "--font-syne", display: "swap" });
const lexend = Lexend({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-lexend", display: "swap" });
// Design 5: Paper Light
const fraunces = Fraunces({ subsets: ["latin"], weight: ["700"], variable: "--font-fraunces", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-source-serif", display: "swap" });
```

Add all font variables to the `<body>` className:
```tsx
<body className={`${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable} ${libreBaskerville.variable} ${outfit.variable} ${dmSans.variable} ${syne.variable} ${lexend.variable} ${fraunces.variable} ${sourceSerif.variable} font-sans`}>
```

### Task 2: Update globals.css

**NOTE:** The font CSS variables are set by `next/font/google` on the `<body>` element (e.g., `--font-cormorant` is injected automatically). Components access them via `style={{ fontFamily: 'var(--font-cormorant)' }}`. You do NOT need to redeclare them in the `@theme inline` block — that would create circular references. Skip this task unless you need to define Tailwind utility classes like `font-cormorant`. If Tailwind utility classes are desired, add them like:

```css
@theme inline {
  /* existing tokens... */
  --font-cormorant: var(--font-cormorant), serif;
  --font-baskerville: var(--font-baskerville), serif;
  --font-outfit: var(--font-outfit), sans-serif;
  --font-dm-sans: var(--font-dm-sans), sans-serif;
  --font-syne: var(--font-syne), sans-serif;
  --font-lexend: var(--font-lexend), sans-serif;
  --font-fraunces: var(--font-fraunces), serif;
  --font-source-serif: var(--font-source-serif), serif;
}
```

However, since each design applies fonts via inline `style` on its wrapper, these Tailwind utilities are optional. The inline style approach is preferred because it keeps fonts scoped to each design component and avoids polluting the global theme with design-trial-specific tokens.

### Task 3: Build Design 2 — Warm Ledger

**File:** `frontend/src/components/dashboards/warm-ledger.tsx`

Create the component following the Warm Ledger spec above. Export as `WarmLedger`. Use the same `ZenVariantProps` interface as `ZenMinimalist` (import the types, define the same props interface).

Key implementation details:
- Wrap content in a div with `style={{ fontFamily: 'var(--font-baskerville)' }}` for body text
- Hero number uses `style={{ fontFamily: 'var(--font-cormorant)' }}`
- Use inline styles for the copper color values (not Tailwind classes) since they're custom to this design
- Chart gradient ID: `warmGradient` (avoid collision with other designs)
- Apply the subtle background radial gradient via an inline style on the outer container
- Implement section dividers as thin `<hr>` elements styled with copper opacity

### Task 4: Build Design 3 — Arctic Glass

**File:** `frontend/src/components/dashboards/arctic-glass.tsx`

Create the component following the Arctic Glass spec above. Export as `ArcticGlass`.

Key implementation details:
- Wrap content in a div with `style={{ fontFamily: 'var(--font-dm-sans)' }}`
- Hero number uses `style={{ fontFamily: 'var(--font-outfit)' }}`
- Glass panels: use the glassmorphism classes specified in the spec
- Chart gradient ID: `arcticGradient`
- The chevron scroll indicator: render a `▾` character with a Framer Motion y-axis bob animation
- Glass panel sections get the `backdrop-blur-sm` and border treatments

### Task 5: Build Design 4 — Neon Dusk

**File:** `frontend/src/components/dashboards/neon-dusk.tsx`

Create the component following the Neon Dusk spec above. Export as `NeonDusk`.

Key implementation details:
- Wrap content in a div with `style={{ fontFamily: 'var(--font-lexend)' }}`
- Hero number uses `style={{ fontFamily: 'var(--font-syne)' }}`
- Chart gradient ID: `duskGradient` — use two stops, magenta to violet
- Add a `<ReferenceLine>` on the chart for the average monthly spend (calculate from `monthly` data)
- Implement the blur-to-sharp hero animation using Framer Motion's `filter` property
- The three-dot scroll indicator: three `<motion.span>` elements with staggered opacity animations
- Number count-up effect: create a small `useCountUp(target, duration)` hook or inline effect for the driver section amounts

### Task 6: Build Design 5 — Paper Light

**File:** `frontend/src/components/dashboards/paper-light.tsx`

Create the component following the Paper Light spec above. Export as `PaperLight`.

Key implementation details:
- The outer wrapper creates the "paper island" with the light background, rounded corners, and shadow
- ALL text colors must be explicitly set (the page inherits white text from the body, so every element needs dark text overrides)
- Chart tooltip must use light styling (white bg, dark text)
- Chart gradient ID: `paperGradient`
- Use `style={{ fontFamily: 'var(--font-source-serif)' }}` for body, `var(--font-fraunces)` for hero
- The scroll indicator uses the CSS "line through text" technique:
  ```tsx
  <div className="relative flex items-center justify-center py-8">
    <div className="absolute inset-x-16 h-px bg-gray-200" />
    <span className="relative bg-[#FAFAF8] px-4 text-xs uppercase tracking-[0.2em] text-gray-400">details</span>
  </div>
  ```
- Category change percentages: green (`#059669`) for decreasing (good), red (`#DC2626`) for increasing (bad)

### Task 7: Update Design Trial Navigator

**File:** `frontend/src/components/dashboards/design-trial-navigator.tsx`

Update the `TRIALS` array:

```typescript
const TRIALS = [
  { id: 1, name: "Zen Minimalist", desc: "Monochrome calm" },
  { id: 2, name: "Warm Ledger", desc: "Amber & serif elegance" },
  { id: 3, name: "Arctic Glass", desc: "Frosted Nordic cool" },
  { id: 4, name: "Neon Dusk", desc: "Cinematic rose glow" },
  { id: 5, name: "Paper Light", desc: "Editorial light mode" },
] as const;
```

### Task 8: Update Route Pages

**`frontend/src/app/1/page.tsx`** — no change needed (already uses `ZenMinimalist`)

**`frontend/src/app/2/page.tsx`** — already uses `ZenMinimalist`, keep as-is (Design 1 = route /2 currently; we need to reorganize)

Actually — **reorganize all routes** so the mapping is clean:

| Route | Design | Component Import |
|-------|--------|-----------------|
| `/1` | Zen Minimalist | `ZenMinimalist` from `zen-minimalist.tsx` |
| `/2` | Warm Ledger | `WarmLedger` from `warm-ledger.tsx` |
| `/3` | Arctic Glass | `ArcticGlass` from `arctic-glass.tsx` |
| `/4` | Neon Dusk | `NeonDusk` from `neon-dusk.tsx` |
| `/5` | Paper Light | `PaperLight` from `paper-light.tsx` |

Each page follows the same pattern:
```tsx
"use client";

import { DesignTrialNavigator } from "@/components/dashboards/design-trial-navigator";
import { ComponentName } from "@/components/dashboards/component-file";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export default function DesignTrialN() {
  const { summary, monthly, forecast, anomalies, recurring, insights, loading, error, useTestData, toggleTestData } =
    useDashboardData();

  return (
    <div className="pt-12">
      <DesignTrialNavigator currentTrial={N} useTestData={useTestData} onToggleTestData={toggleTestData} />
      {loading ? (
        <div className="mx-auto max-w-3xl space-y-8">
          <Skeleton className="mx-auto h-20 w-64" />
          <Skeleton variant="chart" />
        </div>
      ) : error || !summary ? (
        <EmptyState
          title="No data yet"
          description={error || "Import some transactions to see your dashboard."}
          action={{ label: "Import CSV", href: "/import" }}
          secondaryAction={{ label: "Use Test Data", onClick: toggleTestData }}
        />
      ) : (
        <ComponentName
          summary={summary}
          monthly={monthly}
          forecast={forecast}
          anomalies={anomalies}
          recurring={recurring}
          insights={insights}
        />
      )}
    </div>
  );
}
```

All 5 designs receive the **same 6 props**: `summary`, `monthly`, `forecast`, `anomalies`, `recurring`, `insights`. This is important — the props interface must be identical across all designs so the page wrapper is consistent.

### Task 9: Clean Up Old Files

Delete the old component files that are no longer used:
- `frontend/src/components/dashboards/command-center.tsx`
- `frontend/src/components/dashboards/story-mode.tsx`
- `frontend/src/components/dashboards/action-dashboard.tsx`
- `frontend/src/components/dashboards/visual-first.tsx`

---

## Verification

1. `bun dev` — compiles without errors
2. `npx tsc --noEmit` — no TypeScript errors
3. Browser: `/1` shows Zen Minimalist (unchanged from current)
4. Browser: `/2` shows Warm Ledger with copper/serif aesthetic
5. Browser: `/3` shows Arctic Glass with frosted glass panels and sky-blue accents
6. Browser: `/4` shows Neon Dusk with magenta glow and blur effects
7. Browser: `/5` shows Paper Light with light-mode paper island
8. Design Trial Navigator shows updated names and all 5 links work
9. Test Data toggle works on all 5 designs
10. Each design's fonts load correctly (check Network tab for font files)
11. All 5 designs share the same layout structure: hero → chart → scroll → drivers → recurring → insight
12. Scrolling animations work on all designs (sections reveal as they enter viewport)
13. No Tailwind/CSS conflicts between designs (each uses unique gradient IDs, scoped styles)
14. The dark sidebar and navigator look correct alongside the light-mode Design 5
