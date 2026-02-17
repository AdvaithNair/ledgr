# Prompt 3: Backend API — All Endpoints + CSV Parsing

## Goal
Complete REST API with card-agnostic CSV parsing (driven by card config), deduplication for partial/overlapping imports, authorized-user filtering, card management, user config, and full query/stats support. After this prompt, the entire backend is done.

## Prerequisites
- Prompt 2 completed: Database tables exist (including `cards` with 3 presets, `user_config`), connection pool works, models defined

## API Endpoints

### Cards (CRUD)

**`GET /api/cards`** — List all configured cards

Response: `{ "data": [Card] }` ordered by `created_at ASC`

**`POST /api/cards`** — Add a new card

Body:
```json
{
  "code": "discover",
  "label": "Discover It",
  "color": "#FF6600",
  "header_pattern": "trans. date,post date,description",
  "delimiter": ",",
  "date_column": "Trans. Date",
  "date_format": "MM/DD/YY",
  "description_column": "Description",
  "amount_column": "Amount",
  "debit_column": null,
  "credit_column": null,
  "category_column": "Category",
  "member_column": null,
  "skip_negative_amounts": true
}
```

Response: `{ "data": Card }`

Validation: `code` must be unique, `code` and `label` required.

**`PUT /api/cards/:id`** — Update a card's config

Body: partial — only include fields to update.
Response: `{ "data": Card }`

**`DELETE /api/cards/:id`** — Delete a card

Response: `{ "data": "Card deleted" }`
Note: Does NOT delete transactions that reference this card's code.

### User Config

**`GET /api/config`** — Get all config key-value pairs

Response: `{ "data": { "user_name": "John" } }` (object of key→value)

**`PUT /api/config`** — Set one or more config values

Body: `{ "user_name": "John Doe" }`
Response: `{ "data": "Config updated" }`

Uses upsert (`INSERT ... ON CONFLICT (key) DO UPDATE`).


### Transactions

**`GET /api/transactions`** — List with filtering, sorting, pagination

Query params (all optional):
- `card` — filter by card code (comma-separated for multiple: `amex,citi`)
- `category` — filter by category name
- `start_date` — filter `date >= start_date` (format: YYYY-MM-DD)
- `end_date` — filter `date <= end_date` (format: YYYY-MM-DD)
- `search` — case-insensitive LIKE match on description (`%search%`)
- `sort_by` — column to sort by: `date`, `amount`, `description`, `category`, `card` (default: `date`)
- `sort_order` — `asc` or `desc` (default: `desc`)
- `page` — page number, 1-indexed (default: 1)
- `per_page` — items per page, max 200 (default: 50)

Response:
```json
{
  "data": [Transaction],
  "meta": { "page": 1, "per_page": 50, "total": 234, "total_pages": 5 }
}
```

Implementation notes:
- Build the WHERE clause dynamically — only include conditions for params that are present
- Use numbered bind parameters (`$1`, `$2`, ...) with a running counter
- Cast `amount::float8` in the SELECT to match the `f64` Rust type
- Sort column is validated against a whitelist (not user-injected SQL)

**`DELETE /api/transactions`** — Delete all transactions + import history

Response: `{ "data": "All transactions deleted" }`

**`PATCH /api/transactions/:id`** — Update a single transaction's category

Body: `{ "category": "Dining" }`
Response: `{ "data": "Category updated" }`

**`PATCH /api/transactions/bulk-category`** — Bulk update categories

Body: `{ "ids": ["uuid1", "uuid2"], "category": "Dining" }`
Response: `{ "data": "N transactions updated" }`

**Important routing note:** The `/transactions/bulk-category` route must be registered before `/transactions/{id}` to avoid the path `bulk-category` being captured as an `:id` parameter.

### Import

**`POST /api/transactions/import`** — Multipart CSV file upload

- Accepts multipart form with:
  - `file` — the CSV file
  - `card_code` (optional) — the card code to use. If omitted, auto-detect from headers.
- Extract file name and CSV text content
- **Auto-detect card type:** Compare CSV headers against each card's `header_pattern` (see Card Detection below). If no match and no `card_code` provided, return error asking user to select a card.
- **Parse CSV using card config:** Use the matched card's column mappings (`date_column`, `description_column`, `amount_column`/`debit_column`, etc.) to extract transactions dynamically.
- **Authorized-user filtering:** If the card has a `member_column` AND `user_config.user_name` is set, fuzzy-match the member field against the configured user name. Skip rows where the member name doesn't match. Count skipped rows separately.
- **Deduplicate against existing DB hashes** — this is critical for partial/overlapping imports. If a user uploads Feb 1-10 data, then later uploads Feb 1-20, the overlapping transactions (Feb 1-10) are skipped via hash matching.
- Insert new (non-duplicate, user-matching) transactions
- Record import in `import_history` (including `skipped_user_count`)

Response:
```json
{
  "data": {
    "card": "amex",
    "card_label": "Amex Gold",
    "file_name": "amex_jan2025.csv",
    "new_count": 45,
    "duplicate_count": 3,
    "skipped_user_count": 12,
    "total_parsed": 60
  }
}
```

**`GET /api/import-history`** — List all import records

Response: `{ "data": [ImportRecord] }` ordered by `imported_at DESC`

### Stats

**`GET /api/stats/summary`** — Aggregated spending stats

Response:
```json
{
  "data": {
    "total_spent": 12345.67,
    "transaction_count": 456,
    "this_month": 2345.67,
    "last_month": 3456.78,
    "by_card": [
      { "card": "amex", "total": 5000.00, "count": 200 }
    ],
    "by_category": [
      { "category": "Dining", "total": 3000.00, "count": 100 }
    ]
  }
}
```

**`GET /api/stats/monthly`** — Monthly breakdown

Response:
```json
{
  "data": {
    "monthly": [
      { "month": "2025-01", "total": 3456.78, "count": 89 }
    ],
    "monthly_by_card": [
      { "month": "2025-01", "card": "amex", "total": 1500.00 }
    ],
    "monthly_by_category": [
      { "month": "2025-01", "category": "Dining", "total": 800.00 }
    ]
  }
}
```

**`GET /api/stats/merchants`** — Top 20 merchants by total spend

Response:
```json
{
  "data": [
    { "merchant": "COSTCO WHOLESALE", "total": 2345.67, "count": 15 }
  ]
}
```

**`GET /api/stats/patterns`** — Day-of-week and day-of-month spending patterns

Response:
```json
{
  "data": {
    "day_of_week": [
      { "day": "Mon", "day_num": 1, "total": 1234.56, "count": 45 }
    ],
    "day_of_month": [
      { "day": 1, "total": 567.89, "count": 12 }
    ]
  }
}
```
Note: PostgreSQL `EXTRACT(DOW FROM date)` returns 0=Sunday. Map to day names: `["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]`.

## CSV Parser (`backend/src/services/csv_parser.rs`)

### Card Detection (Dynamic, Config-Driven)

Detect card type by matching CSV headers against each card's `header_pattern` from the database:

1. Fetch all cards from DB
2. Join all CSV headers into a single lowercase string
3. For each card, split its `header_pattern` by comma and check if ALL keywords are present in the headers string
4. First card where all keywords match wins
5. If no card matches and no `card_code` was explicitly provided → return error

The 3 preset cards' `header_pattern` values handle the defaults:
- **Amex:** `"card member,extended details"` → matches TSV (tab-separated) CSVs with "Card Member" and "Extended Details" headers. Full columns: Date, Description, Card Member, Account #, Amount, Extended Details, Appears On Your Statement As, Address, City/State, Zip Code, Country, Reference, Category
- **Citi:** `"debit,credit,member name"` → matches CSVs with "Debit", "Credit", and "Member Name" headers. Full columns: Status, Date, Description, Debit, Credit, Member Name
- **Capital One:** `"posted date,card no"` → matches CSVs with "Posted Date" and "Card No." headers. Full columns: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit

Users can add new cards with their own `header_pattern` for auto-detection.

### Dynamic CSV Parsing (Config-Driven)

Instead of hardcoded per-card parse functions, use the card's column config to parse generically:

0. **Delimiter:** Use `card.delimiter` when constructing the CSV reader (e.g., `ReaderBuilder::new().delimiter(delimiter_byte)`). Amex uses tab (`\t`), others use comma (`,`). If delimiter is not set, auto-detect by comparing tab vs comma count in the first line of the file.
1. **Date:** Read from `card.date_column`, parse with `card.date_format` (support `MM/DD/YY`, `MM/DD/YYYY`, and `YYYY-MM-DD`; try all formats as fallback chain)
2. **Description:** Read from `card.description_column`
3. **Amount:** Two modes:
   - If `card.amount_column` is set → read amount from that single column. If `card.skip_negative_amounts` is true, skip rows where amount < 0.
   - If `card.debit_column` is set → read from debit column. Skip rows where debit is empty (credit-only rows). Amount = debit value.
4. **Category:** If `card.category_column` is set AND the value is non-empty, use it. Otherwise auto-categorize.
5. **Member name:** If `card.member_column` is set, extract it for authorized-user filtering (see below).

### Authorized-User Filtering

When importing, if the card has a `member_column` and `user_config.user_name` is set:

1. Extract the member/cardholder name from each CSV row
2. Fuzzy-match it against the configured `user_name`:
   - Lowercase both
   - Check if the configured name is contained within the CSV member field, OR vice versa
   - Also handle "LASTNAME, FIRSTNAME" vs "FIRSTNAME LASTNAME" formats
   - Example: user_name = "John" matches "JOHN DOE", "John Doe", "DOE, JOHN"
   - Example: user_name = "John Doe" matches "JOHN DOE", "DOE, JOHN", "JOHN A DOE"
3. Rows that don't match → skip and increment `skipped_user_count`
4. If `user_name` is NOT configured, import all rows (no filtering)

### Auto-Categorization

Simple keyword-based categorizer on the description (lowercase match):

| Category | Keywords |
|----------|----------|
| Dining | restaurant, cafe, coffee, starbucks, mcdonald, chipotle, grubhub, doordash, uber eat, pizza, sushi, taco, diner, grill, kitchen, bakery, panda express, chick-fil |
| Groceries | grocery, costco, whole foods, trader joe, safeway, kroger, walmart, target, aldi, hmart, sprouts |
| Gas | gas, shell, chevron, exxon, bp, fuel, texaco, 76 |
| Shopping | amazon, amzn |
| Subscriptions | netflix, spotify, hulu, disney, apple.com, youtube, hbo, paramount |
| Transportation | uber, lyft, transit, parking, toll, metro |
| Travel | airline, hotel, airbnb, booking, flight, delta, united, marriott, hilton |
| Health | pharmacy, cvs, walgreens, doctor, medical, health |
| _default_ | Uncategorized |

### Parse function signature

```rust
pub fn parse_csv(data: &str, card: &Card, user_name: Option<&str>) -> Result<ParseResult, String>

pub struct ParseResult {
    pub transactions: Vec<NewTransaction>,
    pub skipped_user_count: usize,  // rows filtered out by user name mismatch
}
```

- Uses `csv::ReaderBuilder` with `flexible(true)`
- Reads headers
- Uses card config to map columns dynamically (not hardcoded per-card logic)
- Applies authorized-user filtering if `member_column` is set and `user_name` is provided
- Skips invalid/credit rows with warnings (don't fail the whole import)
- Stores original CSV row as JSONB in `raw_data`

## Deduplication (`backend/src/services/dedup.rs`)

This is the core mechanism that enables **partial/overlapping imports**. Users can download a CSV for Feb 1–10, import it, then later download Feb 1–20 and import that. The system intelligently skips the Feb 1–10 transactions that were already imported.

- Hash = SHA256 of `"date|description|amount|card"` (amount formatted to 2 decimal places)
- On import: fetch all existing hashes from DB, check each new transaction's hash against the set
- Skip duplicates, count them separately
- The hash index on the transactions table makes this lookup fast

```rust
pub async fn get_existing_hashes(pool: &PgPool) -> HashSet<String>
```

**Edge case:** If two genuinely different transactions have the same date, description, amount, and card (e.g., buying coffee twice in one day at the same place for the same amount), they'll produce the same hash. This is an acceptable trade-off — it's rare and prevents duplicate imports which is the more common problem.

## Route Registration (`backend/src/routes/mod.rs`)

Wire up all routes:
```rust
pub fn api_routes(pool: PgPool) -> Router {
    Router::new()
        .merge(transactions::routes())
        .merge(import::routes())
        .merge(cards::routes())
        .merge(config::routes())
        .with_state(pool)
}
```

**Critical:** In `transactions::routes()`, register `/transactions/bulk-category` BEFORE `/transactions/{id}` so Axum doesn't try to parse "bulk-category" as a UUID.

## Verification

Test all endpoints with curl after `docker-compose up --build`:

```bash
# Health check
curl localhost:8080/health

# ── Cards ──
# List preset cards
curl localhost:8080/api/cards

# Add a custom card
curl -X POST -H "Content-Type: application/json" \
  -d '{"code":"discover","label":"Discover It","color":"#FF6600","header_pattern":"trans. date,description,amount","date_column":"Trans. Date","date_format":"MM/DD/YYYY","description_column":"Description","amount_column":"Amount","skip_negative_amounts":true}' \
  localhost:8080/api/cards

# ── User Config ──
# Set user name (for authorized-user filtering)
curl -X PUT -H "Content-Type: application/json" \
  -d '{"user_name":"John"}' \
  localhost:8080/api/config

# Get config
curl localhost:8080/api/config

# ── Import ──
# Import a CSV (auto-detect card)
curl -F "file=@tests/test_amex.csv" localhost:8080/api/transactions/import

# Import with explicit card code (for CSVs that can't be auto-detected)
curl -F "file=@tests/test_custom.csv" -F "card_code=discover" localhost:8080/api/transactions/import

# Import overlapping data (should show duplicates skipped)
curl -F "file=@tests/test_amex.csv" localhost:8080/api/transactions/import

# ── Transactions ──
curl "localhost:8080/api/transactions?page=1&per_page=10"
curl "localhost:8080/api/transactions?card=amex"
curl "localhost:8080/api/transactions?search=starbucks"

# ── Stats ──
curl localhost:8080/api/stats/summary
curl localhost:8080/api/stats/monthly
curl localhost:8080/api/stats/merchants
curl localhost:8080/api/stats/patterns

# ── Import history ──
curl localhost:8080/api/import-history

# ── Category updates ──
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"category":"Food"}' \
  localhost:8080/api/transactions/<uuid>

curl -X PATCH -H "Content-Type: application/json" \
  -d '{"ids":["uuid1","uuid2"],"category":"Food"}' \
  localhost:8080/api/transactions/bulk-category

# ── Delete all ──
curl -X DELETE localhost:8080/api/transactions
```

Create small test CSV files to verify parsing. Note: test CSVs include multiple card members to verify authorized-user filtering.

**test_amex.csv** (tab-separated — use `\t` between fields):
```tsv
Date	Description	Card Member	Account #	Amount	Extended Details	Appears On Your Statement As	Address	City/State	Zip Code	Country	Reference	Category
1/15/26	STARBUCKS STORE 12345	JOHN DOE	-XXXXX	5.75		STARBUCKS STORE 12345			CA		UNITED STATES	'320260150000000001'	Restaurant-Bar & Café
1/16/26	WHOLE FOODS MKT	JOHN DOE	-XXXXX	87.32		WHOLE FOODS MKT			CA		UNITED STATES	'320260160000000002'	Merchandise & Supplies-Groceries
1/16/26	TARGET STORE	JANE DOE	-YYYYY	42.50		TARGET STORE			OR		UNITED STATES	'320260160000000003'	Merchandise & Supplies-Groceries
1/17/26	ELECTRONIC PAYMENT RECEIVED-THANK	JOHN DOE	-XXXXX	-100.00		ELECTRONIC PAYMENT RECEIVED-THANK
```
With `user_name = "John"`: should import 2 transactions (skip Jane's and the negative payment).

**test_citi.csv:**
```csv
Status,Date,Description,Debit,Credit,Member Name
Cleared,1/16/26,COSTCO WHSE #0144,125.43,,JOHN DOE
Cleared,1/16/26,CHEVRON GAS,45.00,,JOHN DOE
Cleared,1/16/26,NORDSTROM,89.00,,JANE DOE
Cleared,1/14/26,ELECTRONIC PAYMENT-THANK YOU,,-150,JOHN DOE
```
With `user_name = "John"`: should import 2 transactions (skip Jane's and the credit-only payment).

**test_capone.csv:**
```csv
Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
2/12/26,2/12/26,1234,AMAZON MKTPL*ABC123,Merchandise,29.99,
2/11/26,2/11/26,1234,UBER *TRIP,Other Travel,15.50,
2/10/26,2/10/26,1234,PAYMENT,,,200.00
```
Capital One preset has no `member_column`, so no user filtering (all debit rows imported). Note: Capital One uses `M/DD/YY` date format (not `YYYY-MM-DD`).
