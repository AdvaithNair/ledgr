# Prompt 5: CSV Import Page

## Goal
Drag-and-drop CSV upload flow with automatic card detection (falling back to a manual dropdown), client-side preview, backend import with authorized-user filtering, result display with partial-read awareness, and import history. This is the primary data entry point for the app.

## Prerequisites
- Prompt 3 completed: `POST /api/transactions/import`, `GET /api/import-history`, `GET /api/cards`, `GET /api/config`, `PUT /api/config` endpoints work
- Prompt 4 completed: API client, types, layout, UI components exist

## Page: `frontend/src/app/import/page.tsx`

This is a `"use client"` page with a multi-step flow.

### State Machine

```
idle → file-selected → previewing → uploading → done
                 ↑                                 |
                 └─────────────────────────────────┘ (import another)
```

### UI Layout

```
┌─────────────────────────────────────────────┐
│ Import                                       │
│ Upload CSV files from your credit cards      │
├─────────────────────────────────────────────┤
│                                              │
│  ┌─ Drop Zone ──────────────────────────┐   │
│  │                                       │   │
│  │   📄 Drag & drop a CSV file here     │   │
│  │      or click to browse               │   │
│  │                                       │   │
│  │   Supports all configured cards       │   │
│  │   Auto-detects or select manually     │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  [After file selected - Preview Section]     │
│                                              │
│  ┌─ Preview ─────────────────────────────┐  │
│  │ Detected: Amex Gold  ● (card color)   │  │
│  │ — OR if not auto-detected: —          │  │
│  │ Select card: [Amex Gold ▾] dropdown   │  │
│  │ File: amex_jan2025.csv (48 rows)      │  │
│  │                                        │  │
│  │ ┌─ Table ───────────────────────────┐ │  │
│  │ │ Date       Description    Amount  │ │  │
│  │ │ 01/15/25   STARBUCKS      $5.75  │ │  │
│  │ │ 01/16/25   WHOLE FOODS   $87.32  │ │  │
│  │ │ ... (first 20 rows)              │ │  │
│  │ └──────────────────────────────────┘ │  │
│  │                                        │  │
│  │ [Cancel]              [Import →]       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [After import - Result Section]             │
│                                              │
│  ┌─ Import Result ───────────────────────┐  │
│  │ ✓ Successfully imported               │  │
│  │ 45 new transactions                    │  │
│  │ 3 duplicates skipped                   │  │
│  │ 12 other-user transactions filtered   │  │
│  │                                        │  │
│  │ [Import Another]    [View Transactions]│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─── Import History ─────────────────────── │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ File              Card    New  Dup Date│  │
│  │ amex_jan.csv      Amex    45   3  1/20 │  │
│  │ citi_jan.csv      Citi    32   0  1/19 │  │
│  └────────────────────────────────────────┘  │
│                                              │
└─────────────────────────────────────────────┘
```

### Detailed Implementation

#### Drop Zone Component

Can be a separate component `frontend/src/components/drop-zone.tsx` or inline.

- Uses native HTML drag-and-drop events: `onDragOver`, `onDragLeave`, `onDrop`
- Also has a hidden `<input type="file" accept=".csv">` triggered by click
- Visual states:
  - **Default:** Dashed border (`border-border`), muted text
  - **Drag hover:** Border turns bright (e.g., `border-white/50`), background lightens slightly
  - **File selected:** Shows file name + detected card type badge
- Only accepts `.csv` files
- On file drop/select: transition to `file-selected` state

#### Client-Side CSV Preview

- Use `papaparse` to parse the CSV on the client side (no upload yet)
- Parse with `{ header: true, preview: 21 }` (header + 20 data rows)
- **Auto-detect card type** from headers using the dynamic card list (fetched from `GET /api/cards` on page load):
  - For each card, split its `header_pattern` by comma, check if ALL keywords appear in the joined lowercase headers
  - First match wins
  - If no card matches → show a dropdown of all configured cards for manual selection
- Show:
  - **If auto-detected:** Card name with colored dot (color from `card.color`), with a small "Change" link to override via dropdown
  - **If not auto-detected:** Dropdown selector listing all configured cards, with message "Could not auto-detect card type — please select"
  - File name and total row count
  - Preview table of first 20 rows (scrollable horizontally if needed)
  - Table styled with dark theme: `bg-surface`, subtle row borders
  - Amounts right-aligned in `font-mono`
- Two buttons: "Cancel" (returns to idle) and "Import" (uploads to backend)

#### Upload Flow

- On "Import" click: transition to `uploading` state
- Show a loading indicator (spinner or progress bar)
- Call `importCSV(file, cardCode)` from the API client — pass the selected/detected card code
- The API client sends the raw file as multipart form data:
  ```typescript
  const formData = new FormData();
  formData.append("file", file);
  if (cardCode) formData.append("card_code", cardCode);
  const response = await fetch(`${API_BASE}/transactions/import`, {
    method: "POST",
    body: formData,
  });
  ```
- On success: transition to `done` state, display result
- On error: show error message, allow retry

#### Result Display

- Shows:
  - New count (green accent)
  - Duplicate count (muted — this is expected for partial/overlapping imports, not an error)
  - Skipped user count (if > 0, show with info icon: "Filtered out N transactions from other cardholders")
  - Total parsed
- If ALL transactions were duplicates, show a friendly message: "All transactions in this file were already imported" (not an error, just informational)
- Two actions:
  - "Import Another" — reset to `idle` state
  - "View Transactions" — navigate to `/transactions` via `router.push`

#### Import History Section

- Always visible at the bottom of the page
- Fetches from `GET /api/import-history` on page load and after each import
- Displays as a table:
  - Columns: File Name, Card (with colored badge using `card.color`), New, Duplicates, Filtered, Date
  - "Filtered" column shows `skipped_user_count` (only if > 0 for any row, otherwise hide column)
  - Sorted by most recent first
  - Card badge color fetched from cards list by code
  - Date formatted with `date-fns` (e.g., "Jan 20, 2025")
- If no import history, show a subtle "No imports yet" message

### State Management

Use React `useState` for the state machine:

```typescript
type ImportState = "idle" | "file-selected" | "previewing" | "uploading" | "done";

const [state, setState] = useState<ImportState>("idle");
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<ParseResult | null>(null);
const [detectedCard, setDetectedCard] = useState<Card | null>(null); // Auto-detected card config
const [selectedCardCode, setSelectedCardCode] = useState<string | null>(null); // Manual override or selection
const [result, setResult] = useState<ImportResult | null>(null);
const [error, setError] = useState<string | null>(null);
const [history, setHistory] = useState<ImportRecord[]>([]);
const [cards, setCards] = useState<Card[]>([]); // All configured cards, fetched on mount
const [userConfig, setUserConfig] = useState<UserConfig | null>(null); // For showing user filter status
```

Fetch cards and user config on mount:
```typescript
useEffect(() => {
  Promise.all([getCards(), getConfig(), getImportHistory()])
    .then(([c, cfg, h]) => {
      setCards(c.data);
      setUserConfig(cfg.data);
      setHistory(h.data);
    });
}, []);
```

### Card Detection (Client-Side, Dynamic)

Uses the same logic as the backend but driven by the card configs fetched from the API:

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

If detection returns `null`, the UI shows a dropdown of all configured cards for manual selection. The user must pick one before importing.

### User Name Configuration Banner

At the top of the import page (above the drop zone), show a small configuration banner:

- **If `user_name` is NOT set:** Show an info banner: "Set your name to filter out other cardholders' transactions" with an inline text input + Save button. This is optional — the user can dismiss it and import without filtering.
- **If `user_name` IS set:** Show a subtle indicator: "Filtering for: John Doe" with an "Edit" link
- The `user_name` is persisted via `PUT /api/config` and applies to all future imports
- This can also be configured on the Settings page, but surfacing it on the import page makes onboarding smoother

### Animations

- Use Framer Motion `AnimatePresence` + `motion.div` for transitions between states (fade/slide)
- Drop zone border pulse on drag hover
- Result card slides in on import completion

## Verification

1. Navigate to `/import` — see the user name banner and drop zone
2. Set user name (e.g., "John") — banner updates to show "Filtering for: John"
3. Drag a CSV file onto the drop zone — file name appears, preview loads
4. **Auto-detection works:** Card type auto-detected and shown with correct color from card config
5. **Auto-detection fallback:** Try a CSV with unknown headers — dropdown appears for manual card selection
6. Preview table shows first 20 rows correctly parsed
7. Click "Import" — loading state shown, then result with counts
8. Result shows new count, duplicate count, and filtered-user count (if applicable)
9. Import history table updates with the new entry, card badge has correct color
10. Click "Import Another" — returns to clean drop zone
11. **Partial read test:** Upload the same file again — should show "All transactions already imported" (all duplicates)
12. **User filtering test:** Upload a CSV with multiple cardholders — only matching user's transactions imported, skipped count shown
13. Try an invalid file — should show error message
