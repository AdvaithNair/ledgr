# Frontend Design — Build UI with the Ledgr design system

You are building frontend UI for Ledgr, a dark-themed personal finance dashboard. Apply the full design system below to: $ARGUMENTS

## Design System

### Color Tokens (use Tailwind classes, never raw hex in components)

| Token | Hex | Tailwind Class |
|-------|-----|----------------|
| Background | `#0A0A0F` | `bg-background` |
| Surface | `#141419` | `bg-surface` |
| Border | `#1E1E26` | `border-border` |
| Amex accent | `#C5A44E` | `text-amex`, `bg-amex` |
| Citi accent | `#0066B2` | `text-citi`, `bg-citi` |
| CapOne accent | `#D42427` | `text-capitalone`, `bg-capitalone` |

### Category Colors (from `src/lib/constants.ts`)

```
Dining: #F59E0B, Groceries: #10B981, Gas: #EF4444, Shopping: #8B5CF6,
Subscriptions: #EC4899, Transportation: #06B6D4, Travel: #3B82F6,
Health: #14B8A6, Uncategorized: #6B7280
```

### Typography

- **Financial data** (amounts, stats, numbers): `font-mono` (JetBrains Mono)
- **UI text** (labels, descriptions, nav): `font-sans` (Inter)
- Muted text: `text-gray-400` or `text-gray-500`
- Primary text: `text-white` or `text-gray-100`

### Component Patterns

Use existing components from `src/components/`:

- **Card** (`ui/card.tsx`): Surface container — `bg-surface border border-border rounded-lg p-6`
- **Button** (`ui/button.tsx`): Variants: primary (white bg), secondary (surface bg), danger (red)
- **Badge** (`ui/badge.tsx`): Colored pill for card labels and categories
- **StatCard** (`ui/stat-card.tsx`): Label + large mono value + optional trend
- **Skeleton** (`ui/skeleton.tsx`): Loading placeholders with shimmer animation
- **EmptyState** (`ui/empty-state.tsx`): Icon + title + description + optional CTA
- **PageHeader** (`page-header.tsx`): Title + description + optional right-side action

### Recharts Dark Theme

When using Recharts charts, apply this configuration:

```tsx
// Grid
<CartesianGrid strokeDasharray="3 3" stroke="#1E1E26" />

// Axes
<XAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
<YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />

// Tooltip
<Tooltip
  contentStyle={{
    backgroundColor: '#141419',
    border: '1px solid #1E1E26',
    borderRadius: '8px',
    color: '#fff',
  }}
/>

// Use ResponsiveContainer always
<ResponsiveContainer width="100%" height={300}>
```

Use category/card colors from constants for chart series — never use Recharts defaults.

### Framer Motion Animations

```tsx
// Page/card entrance
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Staggered children
transition={{ delay: index * 0.1 }}
```

### File Conventions

- File names: `kebab-case.tsx` (e.g., `spending-chart.tsx`)
- Component names: `PascalCase` (e.g., `SpendingChart`)
- Functions: `camelCase`
- Add `"use client"` only if the component uses hooks, event handlers, or browser APIs
- Types live in `src/types/index.ts` — import from there
- API functions live in `src/lib/api.ts` — import from there
- Constants (card defs, category colors) in `src/lib/constants.ts`

### Responsive Patterns

```tsx
// Standard grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Chart containers — always use ResponsiveContainer
<ResponsiveContainer width="100%" height={300}>
```

## Instructions

1. Read `CLAUDE.md` and check existing components in `src/components/` before creating new ones.
2. Reuse existing UI components — don't recreate Card, Button, etc.
3. All financial numbers must use `font-mono`.
4. All colors must come from Tailwind tokens or constants — no hardcoded hex in JSX.
5. Every page needs loading states (Skeleton) and empty states (EmptyState).
6. After writing code, run `npx tsc --noEmit` from `frontend/` to verify no type errors.
