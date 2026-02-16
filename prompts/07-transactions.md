# Prompt 7: Transactions Table

## Goal
Full-featured transactions table with server-side pagination, sorting, filtering, search, bulk category edit, and expandable rows showing raw CSV data.

## Prerequisites
- Prompt 3 completed: `GET /api/transactions` (with all query params), `PATCH /api/transactions/:id`, `PATCH /api/transactions/bulk-category` work
- Prompt 4 completed: Types, API client, UI components exist

## Page: `frontend/src/app/transactions/page.tsx`

`"use client"` page.

### UI Layout

```
┌────────────────────────────────────────────────────────────┐
│ Transactions                                                │
│ All your spending in one place          [Delete All] (danger)│
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌── Filters Bar ──────────────────────────────────────────┐│
│ │ 🔍 [Search transactions...         ]                    ││
│ │                                                          ││
│ │ Card: [All] [Amex] [Citi] [CapOne]                      ││
│ │ Category: [All ▾]                                        ││
│ │ Date: [7d] [30d] [90d] [YTD] [All] [Custom...]         ││
│ │                                                          ││
│ │ 234 transactions · $12,345.67 total                      ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌── Bulk Actions (visible when rows selected) ────────────┐│
│ │ ☑ 5 selected    [Set Category ▾]   [Clear Selection]    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌── Table ─────────────────────────────────────────────────┐│
│ │ ☐ │ Date ↕  │ Description        │ Amount ↕ │ Category │ Card    ││
│ │───┼─────────┼────────────────────┼──────────┼──────────┼─────────││
│ │ ☐ │ Jan 15  │ STARBUCKS #12345   │   $5.75  │ Dining   │ 🟡 Amex ││
│ │   │         │ ▼ Raw: Date=01/... │          │          │         ││
│ │ ☐ │ Jan 16  │ WHOLE FOODS MKT    │  $87.32  │ Grocery  │ 🟡 Amex ││
│ │ ☐ │ Jan 16  │ COSTCO WHOLESALE   │ $125.43  │ Grocery  │ 🔵 Citi ││
│ │ ☐ │ Feb 01  │ AMAZON.COM         │  $29.99  │ Shopping │ 🔴 CapOne││
│ │ ...                                                       ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌── Pagination ────────────────────────────────────────────┐│
│ │ ◀ Prev  Page 1 of 5  (50 per page)  Next ▶             ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Detailed Implementation

#### State Management

```typescript
// Filter state
const [search, setSearch] = useState("");
const [cardFilter, setCardFilter] = useState<string[]>([]); // empty = all
const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
const [datePreset, setDatePreset] = useState<string>("all");
const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
const [sortBy, setSortBy] = useState("date");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
const [page, setPage] = useState(1);
const [perPage] = useState(50);

// Data state
const [data, setData] = useState<TransactionsResponse | null>(null);
const [loading, setLoading] = useState(true);

// Cards (fetched from API for dynamic filter buttons + colors)
const [cards, setCards] = useState<Card[]>([]);

// Selection state
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Expanded rows
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
```

Fetch cards on mount:
```typescript
useEffect(() => { getCards().then(c => setCards(c.data)); }, []);
```

#### Data Fetching

Build query params from filter state and call `getTransactions()`:

```typescript
useEffect(() => {
  const params: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
    sort_by: sortBy,
    sort_order: sortOrder,
  };
  if (search) params.search = search;
  if (cardFilter.length) params.card = cardFilter.join(",");
  if (categoryFilter) params.category = categoryFilter;
  // Date range based on preset or custom
  if (dateRange.start) params.start_date = dateRange.start;
  if (dateRange.end) params.end_date = dateRange.end;

  setLoading(true);
  getTransactions(params).then(setData).finally(() => setLoading(false));
}, [search, cardFilter, categoryFilter, datePreset, sortBy, sortOrder, page]);
```

#### Search Bar

- Text input with search icon, full width
- **Debounced:** don't fire API request on every keystroke. Use a 300ms debounce.
  ```typescript
  // Implement debounce with useEffect + setTimeout
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  ```
- Reset to page 1 when search changes
- Placeholder: "Search transactions..."

#### Card Filter

- **Dynamic** — fetches card list from `GET /api/cards` on mount, renders a toggle button for each configured card + "All"
- Multi-select: clicking a card toggles it. If all or none selected, no filter applied.
- Each button shows card color accent (dot or border, color from `card.color` via inline style)
- Active state: filled with card color at low opacity
- Automatically adapts when user adds/removes cards in settings

#### Category Filter

- Dropdown select with all categories from `CATEGORIES` constant
- "All" option to clear filter
- Reset to page 1 on change

#### Date Range Filter

Preset buttons + custom range:

| Preset | Behavior |
|--------|----------|
| 7d | `start_date` = 7 days ago |
| 30d | `start_date` = 30 days ago |
| 90d | `start_date` = 90 days ago |
| YTD | `start_date` = Jan 1 of current year |
| All | No date filter |
| Custom | Show two date inputs (start + end) |

Use `date-fns` for date math (`subDays`, `startOfYear`, `format`).

#### Results Summary

Below the filters, show: "**234 transactions** · **$12,345.67** total"
- Transaction count from `meta.total`
- Total calculated from current page data or a separate query (for simplicity, sum the current page amounts and note it's for this page, OR just show the count from meta)

#### Table

**Columns:**
1. **Checkbox** — for bulk selection
2. **Date** — formatted "Jan 15, 2025", sortable
3. **Description** — truncated to ~50 chars, full on hover (title attribute), clickable to expand row
4. **Amount** — right-aligned, `font-mono`, formatted as `$1,234.56`, sortable
5. **Category** — shown as a colored badge, clickable to edit (inline dropdown)
6. **Card** — card label with colored dot (color looked up from `cards` array by card code, applied via inline `style`)

**Sorting:**
- Column headers with sort indicators (↑↓ or ↕)
- Click to toggle: unsorted → desc → asc → desc → ...
- Only one column sorted at a time
- Reset to page 1 on sort change

**Row Styling:**
- Alternating row backgrounds: `bg-surface` and slightly lighter
- Hover: subtle highlight, use card accent color at very low opacity (e.g., if amex row, hover shows faint gold tint)
- Sticky header row (stays at top when scrolling table)

**Expandable Rows:**
- Click the description or an expand icon to toggle row expansion
- Expanded section shows the `raw_data` JSONB content as a formatted key-value list
- Styled as an indented sub-row with slightly different background
- Animate open/close with Framer Motion (height transition)

#### Inline Category Edit

When clicking a category badge in the table:
- Show a dropdown with all categories
- On select: call `updateCategory(id, newCategory)` API
- Optimistically update the UI
- Show brief success indication (flash green or similar)

#### Bulk Selection + Category Update

- Header row has a "select all on this page" checkbox
- Each row has an individual checkbox
- When any rows are selected, show the **bulk action bar** above the table:
  - Shows count: "5 selected"
  - Category dropdown: select a category and apply to all selected via `bulkUpdateCategory(ids, category)`
  - "Clear selection" button
- After bulk update: refresh the data, clear selection

#### Pagination

- Below the table
- Shows: "Page X of Y" with prev/next buttons
- Disable prev on page 1, disable next on last page
- Per-page selector could be added but 50 is fine as default
- Clicking prev/next scrolls to top of table

#### Delete All Button

- In the page header area, a danger-styled button
- On click: show confirmation dialog (simple `window.confirm` or a modal)
- Calls `deleteAllTransactions()`
- On success: refresh data, show empty state

#### Empty State

If no transactions at all:
- EmptyState component: "No transactions yet"
- CTA: "Import CSV files" → links to `/import`

If filters return no results:
- "No transactions match your filters"
- "Clear filters" link

## Verification

1. Navigate to `/transactions` — table loads with all transactions
2. **Search:** Type "starbucks" → table filters to matching rows (debounced)
3. **Card filter:** Click "Amex" → only Amex transactions shown. Click "Citi" too → both shown.
4. **Category filter:** Select "Dining" → only dining transactions
5. **Date presets:** Click "30d" → only last 30 days. Click "All" → all shown.
6. **Sort:** Click "Amount" header → sorts by amount desc. Click again → asc.
7. **Pagination:** Navigate between pages, counts update correctly
8. **Expand row:** Click a row → raw CSV data shown below
9. **Inline category edit:** Click a category badge → dropdown appears → select new category → updates
10. **Bulk edit:** Select 3 rows → bulk bar appears → set category → all 3 updated
11. **Delete all:** Click delete → confirm → all transactions removed → empty state shown
12. All filters reset page to 1 when changed
13. Search is debounced (no API call on every keystroke)
