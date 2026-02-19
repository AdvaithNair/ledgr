# Prompt 08_01: Remaining Frontend Tasks (from Prompts 5–8)

## Summary

Audit of existing pages against prompts 5–8 found two pages with notable gaps. The dashboard (prompt 6) and analytics (prompt 8) pages are complete — the analytics page was intentionally redesigned with enhanced backends (prompt 9) and exceeds what prompt 8 specified. The import and transactions pages have functional cores but are missing several planned features.

---

## 1. Import Page — Missing Features

**File:** `frontend/src/app/import/page.tsx`

### 1a. Client-Side CSV Preview

The current import page goes straight from file selection to import. Prompt 5 specifies a preview step.

**What to add:**
- Parse the dropped CSV client-side with `papaparse` (`{ header: true, preview: 21 }`) before uploading
- Show a preview table of the first 20 data rows inside a `ThemedPanel`
  - Table styled with `ThemedTable`/`ThemedTh`/`ThemedTd`
  - Amounts right-aligned in `font-mono` (via `fontVariantNumeric: "tabular-nums"`)
  - Horizontally scrollable if many columns
- Show file name and total row count above the table
- Add "Cancel" (returns to idle, clears file) and "Import" buttons below the preview
- State machine becomes: `idle → file-selected → previewing → uploading → done`

### 1b. Auto-Detect Card Type from CSV Headers

Currently the page only has a manual card dropdown. Prompt 5 specifies client-side auto-detection.

**What to add:**
- On CSV parse, run detection logic against fetched cards:
  ```typescript
  function detectCardFromHeaders(headers: string[], cards: Card[]): Card | null {
    const joined = headers.join(",").toLowerCase();
    for (const card of cards) {
      if (!card.header_pattern) continue;
      const keywords = card.header_pattern.split(",").map(k => k.trim().toLowerCase());
      if (keywords.every(kw => joined.includes(kw))) return card;
    }
    return null;
  }
  ```
- **If auto-detected:** Show card name with colored dot (color from `card.color`) and a small "Change" link to switch to dropdown
- **If not detected:** Show dropdown with message "Could not auto-detect card type"
- The manual dropdown should remain as fallback/override

### 1c. User Name Configuration Banner

Prompt 5 calls for an inline user-name setup above the drop zone.

**What to add:**
- Fetch `getConfig()` on mount (already fetching cards and history)
- **If `user_name` is NOT set:** Show an info-style `ThemedPanel` banner: "Set your name to filter out other cardholders' transactions" with a `ThemedInput` + `ThemedButton` (Save). Dismissible.
- **If `user_name` IS set:** Show subtle text: "Filtering for: [name]" with an "Edit" link that reveals the input
- Persist via `PUT /api/config` (use `updateConfig` from API client)

### 1d. Post-Import Navigation

After a successful import, the result card should have two action buttons:
- **"Import Another"** — reset state to idle (clear file, result, error)
- **"View Transactions"** — `router.push("/transactions")` (import `useRouter` from `next/navigation`)

Also: if ALL transactions were duplicates (`new_count === 0 && duplicate_count > 0`), show: "All transactions in this file were already imported" as informational, not error.

---

## 2. Transactions Page — Missing Features

**File:** `frontend/src/app/transactions/page.tsx`

### 2a. Expandable Rows (Raw Data)

Prompt 7 specifies clicking a row to see its `raw_data` JSON content.

**What to add:**
- Track expanded row IDs: `const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())`
- Click description cell (or a chevron icon) to toggle expansion
- Expanded section: indented sub-row below the transaction showing `raw_data` as key-value pairs
  - Styled with slightly different background (`theme.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"`)
  - Keys in `theme.textMuted`, values in `theme.text`, both `fontSize: "12px"`
- Animate with Framer Motion `AnimatePresence` (height + opacity transition)

### 2b. Bulk Selection + Category Update

Prompt 7 specifies multi-select with a bulk action bar.

**What to add:**
- Selection state: `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())`
- Add checkbox column to table:
  - Header: "select all on this page" checkbox
  - Each row: individual checkbox
- When any rows are selected, show a **bulk action bar** between the filter panel and table:
  - Shows count: "N selected"
  - Category dropdown: select a category and apply via `bulkUpdateCategory(ids, category)` (already in `api.ts`)
  - "Clear selection" button
- After bulk update: refresh data, clear selection
- Clear selection on page/filter change

---

## 3. Already Complete (No Action Needed)

### Dashboard (Prompt 6)
- `frontend/src/app/page.tsx` uses the Meridian layout with full data: summary, monthly, forecast, anomalies, recurring, insights, habits, daily, merchants, cards
- Empty state, loading skeletons, test data toggle all present
- Hero stat, charts, card comparison, merchants all handled by Meridian

### Analytics (Prompt 8)
- `frontend/src/app/analytics/page.tsx` was redesigned with enhanced prompt-9 backends
- Four tabs: Habits (impulse spending, weekend splurge, category creep, merchant concentration), Patterns (day-of-week bars, day-of-month area, 90-day heatmap), Subscriptions (active list, forgotten alerts), Forecast (month projection, category forecasts, projection methods)
- This exceeds the original prompt 8 spec (which had simpler stacked area + accordion)

### Settings
- `frontend/src/app/settings/page.tsx` — fully built with name config, card CRUD, data management, theme switcher

---

## Design Constraints

All new UI must use the existing themed component system:
- `ThemedPanel`, `ThemedTable`, `ThemedTh`, `ThemedTd`, `ThemedTr` from `themed-components.tsx`
- `ThemedButton`, `ThemedInput`, `ThemedSelect` from `ui/themed-*.tsx`
- `ThemedBadge`, `ThemedSkeleton`, `ThemedEmptyState`
- `PageShell` for page wrapper
- Access theme via `useTheme()` — use `theme.*` properties for all colors, fonts, spacing
- Animations via Framer Motion (`motion.div`, `AnimatePresence`)
- No hardcoded hex colors in components — use theme tokens

---

## Verification

After implementing all tasks:

1. `/import` — drop a CSV → preview table shows first 20 rows → card auto-detected or dropdown shown
2. `/import` — set user name via banner → "Filtering for: [name]" appears
3. `/import` — click Import → result shows → "Import Another" and "View Transactions" buttons work
4. `/import` — re-import same file → "All transactions already imported" message
5. `/transactions` — click a row description → raw data expands below with animation
6. `/transactions` — select 3 rows via checkboxes → bulk bar appears → set category → all 3 updated
7. `/transactions` — select-all checkbox → all rows on page selected
8. All new UI respects both Arctic and Paper themes, dark and light modes
9. No TypeScript errors (`bun run build` passes)
10. No console errors in browser
