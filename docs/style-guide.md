# Ledgr Dashboard Style Guide

Two design languages — **Arctic** and **Paper** — each with dark and light modes, for a total of four theme variants. This document defines the rules that every dashboard layout must follow.

---

## Arctic

**Identity:** Technical dashboard. Clean geometry, frosted glass, sky-blue luminance. Feels like a control panel in a snow station.

### Typography

| Element | Font | Weight | Style | Size guideline |
|---------|------|--------|-------|----------------|
| Hero stat (big number) | Outfit (`displayFont`) | Bold | Normal | `text-4xl` to `text-6xl` |
| Section headings | Outfit (`displayFont`) | 700 (`headingWeight`) | Normal — never italic | `text-xl` |
| Section labels | DM Sans (`bodyFont`) | Normal | Uppercase, `tracking-widest` | `text-xs` |
| Body text | DM Sans (`bodyFont`) | Normal | Normal | `text-sm`, line-height 1.5 |
| Financial values | DM Sans (`bodyFont`) | 500 (medium) | Normal, `tabular-nums` | Varies by context |
| Muted annotations | DM Sans (`bodyFont`) | Normal | Normal | `text-xs` |

### Colors

| Token | Dark | Light |
|-------|------|-------|
| Background | `#0A0A0F` | `#EFF6FF` |
| Surface | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.7)` |
| Border | `rgba(255,255,255,0.06)` | `rgba(125,211,252,0.2)` |
| Text | `#FFFFFF` | `#0C1A2E` |
| Text muted | `rgba(125,211,252,0.35)` | `#5B7A9E` |
| Accent | `#7DD3FC` | `#0284C7` |
| Label color | Accent (sky blue) | Accent (deeper blue) |
| Heading color | Primary text | Primary text |
| Danger | `#F87171` | `#DC2626` |
| Success | `#34D399` | `#059669` |
| Chart stroke | `#7DD3FC` | `#0284C7` |

### Panels

- Frosted glass: `backdrop-blur-sm`, translucent surface
- Border radius: `rounded-2xl` (16px)
- Padding: 20px (`panelPadding`)
- Shadow: Subtle blue glow (`0 0 30px rgba(125,211,252,0.05)`)
- Hover: Slightly brighter border, lifted shadow

### Dividers

- Dashed line in accent tint
- `repeating-linear-gradient` pattern, 6px dash / 6px gap

### Charts

- Stroke: Sky blue accent
- Gradient fill: Accent color, 20% opacity (dark) / 8% opacity (light) fading to transparent
- CartesianGrid: Only in light mode, dashed
- Axis text: Muted sky-tinted color, 11px
- Bar radius: `[0, 4, 4, 0]` for horizontal bars

### Animations

- Snappy: 0.3–0.5s duration
- Enter with `opacity + y + scale(0.97)`
- Stagger: 0.05–0.1s per item
- Spring physics for hero elements

---

## Paper

**Identity:** Editorial magazine. Warm serif typography, literary pacing, emerald accents. Feels like a beautifully typeset financial report.

### Typography

| Element | Font | Weight | Style | Size guideline |
|---------|------|--------|-------|----------------|
| Hero stat (big number) | Fraunces (`displayFont`) | 400 (`headingWeight`) | Italic (`headingItalic`) | `text-4xl` to `text-6xl` |
| Section headings | Fraunces (`displayFont`) | 400 (`headingWeight`) | Italic | `text-xl` |
| Section labels | Source Serif 4 (`bodyFont`) | Normal | Uppercase, `tracking-widest` (0.12em) | `text-xs` |
| Body text | Source Serif 4 (`bodyFont`) | Normal | Normal | `text-sm`, line-height 1.75 |
| Financial values | Source Serif 4 (`bodyFont`) | 500 (medium) | Normal, `tabular-nums` | Varies by context |
| Muted annotations | Source Serif 4 (`bodyFont`) | Normal | Normal | `text-xs` |

### Colors

| Token | Dark | Light |
|-------|------|-------|
| Background | `#171412` | `#FAFAF8` |
| Surface | `rgba(255,255,255,0.04)` | `#FFFFFF` |
| Border | `rgba(255,255,255,0.08)` | `#E5E7EB` |
| Text | `#F5F0EB` | `#1A1A1A` |
| Text muted | `#8B7E74` | `#9CA3AF` |
| Accent | `#34D399` | `#059669` |
| Label color | Muted (`#A69888` dark / `#6B7280` light) — NOT accent | Same |
| Heading color | Accent (emerald) | Accent (deeper emerald) |
| Danger | `#F87171` | `#DC2626` |
| Success | `#34D399` | `#059669` |
| Chart stroke | `#34D399` (dark) / `#1A1A1A` (light) | — |

### Panels

- Solid surface, no blur
- Border radius: `rounded-xl` (12px)
- Padding: 24px (`panelPadding`) — more generous, editorial breathing room
- Shadow: Warm subtle (`0 2px 8px rgba(0,0,0,0.3)` dark / `0 1px 3px rgba(0,0,0,0.08)` light)

### Dividers

- Solid thin line, warm tone
- `rgba(255,255,255,0.08)` dark / `#E5E7EB` light

### Charts

- Stroke: Emerald accent (dark) / near-black (light)
- Gradient fill: Accent color, 15% opacity (dark) / 8% opacity (light) fading to transparent
- CartesianGrid: Always visible, dashed
- Axis text: Warm muted color, 11px
- Bar radius: `[0, 3, 3, 0]` — slightly softer than Arctic

### Animations

- Gentle: 0.4–0.6s duration
- Enter with `opacity + y` only — NO scale transform
- Stagger: 0.08–0.1s per item
- Ease-out curves, no springs

---

## Shared Rules (Both Styles)

### Financial Data

Financial numbers use the **style's own body font** (DM Sans for Arctic, Source Serif for Paper) — never `font-mono` (JetBrains Mono). This ensures numbers feel native to each style rather than identical across both.

Use the `useNumericStyle()` hook from `themed-components.tsx`, which returns:

```ts
{ fontFamily: theme.bodyFont, fontVariantNumeric: "tabular-nums", fontWeight: 500 }
```

- `tabular-nums` ensures digits align vertically in lists and tables
- `fontWeight: 500` (medium) distinguishes numbers from regular body text without being bold

```tsx
const numericStyle = useNumericStyle();

// Correct — financial value in a list
<span className="text-sm" style={{ ...numericStyle, color: theme.text }}>
  {formatCurrency(amount)}
</span>

// Correct — inline number in prose
<span style={numericStyle}>{formatCurrency(amount)}</span>

// Correct — hero stat (display font, bold — the one exception)
<p className="text-5xl font-bold" style={{ fontFamily: theme.displayFont }}>
  {formatCurrency(total)}
</p>

// Wrong — using font-mono
<span className="font-mono text-sm">{formatCurrency(amount)}</span>
```

### Theme Token Usage

Layouts access style properties through the `theme` object from `useTheme()`. Never hardcode style-specific values — always use the token.

| Token | Purpose |
|-------|---------|
| `theme.displayFont` | Headlines, hero stats |
| `theme.bodyFont` | Body text, labels, annotations |
| `theme.headingWeight` | Section heading font-weight |
| `theme.headingItalic` | Section heading font-style |
| `theme.headingColor` | Section heading color |
| `theme.labelColor` | ThemedLabel color |
| `theme.bodyLineHeight` | Body text line-height |
| `theme.panelPadding` | Panel inner padding |
| `theme.barRadius` | Bar chart corner radius |
| `theme.chartStroke` | Chart line/area stroke color |
| `theme.accent` | Primary accent for interactive elements |
| `theme.accentMuted` | Accent backgrounds (pills, badges) |

### Responsive Layout

```tsx
// Standard grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Charts — always use ResponsiveContainer
<ResponsiveContainer width="100%" height={280}>
```

### Component Hierarchy

1. **ThemedBackground** — outermost wrapper, handles blobs (dark) and rounded island (light)
2. **ThemedPanel** — card container, uses `theme.glassPanel` classes
3. **ThemedLabel** — uppercase section label, style-aware color
4. **ThemedSectionHeading** — section heading with italic/weight from theme
5. **ThemedDivider** — dashed (Arctic) or solid (Paper) separator
