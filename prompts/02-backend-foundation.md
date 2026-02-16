# Prompt 2: Database Schema + Rust Backend Foundation

## Goal
PostgreSQL tables created via migrations, SQLx connection pool, DB models, config module. Backend boots and connects to the database successfully.

## Prerequisites
- Prompt 1 completed: Docker Compose with PostgreSQL + Rust project skeleton exist and build

## Detailed Tasks

### 1. Database Schema (SQL migrations)

Create four tables. Migrations should run automatically on backend startup (inline SQL executed via `sqlx::query`, not sqlx-cli — keeps it simple).

**`cards` table** (card definitions — user can add custom cards):
```sql
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,          -- 'amex', 'citi', 'capitalone', or user-defined
    label TEXT NOT NULL,                -- 'Amex Gold', 'Citi Costco', etc.
    color TEXT NOT NULL DEFAULT '#6B7280', -- Hex color for UI
    header_pattern TEXT,                -- Comma-separated keywords to auto-detect from CSV headers (lowercase)
    delimiter TEXT NOT NULL DEFAULT ',', -- CSV field delimiter (',' or '\t')
    date_column TEXT,                   -- CSV column name for date (e.g. "Date", "Transaction Date")
    date_format TEXT DEFAULT 'MM/DD/YY', -- Date parsing format (supports MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD)
    description_column TEXT,            -- CSV column name for description
    amount_column TEXT,                 -- CSV column name for single amount field (e.g. Amex "Amount")
    debit_column TEXT,                  -- CSV column name for debit (e.g. "Debit") — used when amount is split
    credit_column TEXT,                 -- CSV column name for credit (e.g. "Credit") — rows with only credit are skipped
    category_column TEXT,               -- Optional CSV column for category (e.g. Capital One has "Category")
    member_column TEXT,                 -- Optional CSV column for cardholder name (e.g. "Card Member", "Member Name")
    skip_negative_amounts BOOLEAN NOT NULL DEFAULT false, -- If true, skip rows with negative amount (Amex credits)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_code ON cards(code);
```

**Seed 3 preset cards** (insert if not exists):
```sql
INSERT INTO cards (code, label, color, header_pattern, delimiter, date_column, date_format, description_column, amount_column, debit_column, credit_column, category_column, member_column, skip_negative_amounts) VALUES
('amex', 'Amex Gold', '#C5A44E', 'card member,extended details', E'\t', 'Date', 'MM/DD/YY', 'Description', 'Amount', NULL, NULL, 'Category', 'Card Member', true),
('citi', 'Citi Costco', '#0066B2', 'debit,credit,member name', ',', 'Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', NULL, 'Member Name', false),
('capitalone', 'Capital One', '#D42427', 'posted date,card no', ',', 'Transaction Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', 'Category', NULL, false)
ON CONFLICT (code) DO NOTHING;
```

**`user_config` table** (persistent settings, primarily the user's name for filtering):
```sql
CREATE TABLE IF NOT EXISTS user_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Key values used:
- `user_name` — the user's name for filtering authorized-user transactions (fuzzy matched)

**`transactions` table:**
```sql
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    card TEXT NOT NULL,          -- references cards.code (not a FK for flexibility)
    card_label TEXT NOT NULL,    -- denormalized label at time of import
    raw_data JSONB,             -- Original CSV row as JSON
    hash TEXT NOT NULL,         -- SHA256 hash for deduplication (handles partial/overlapping imports)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(card);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);
```

**`import_history` table:**
```sql
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    card TEXT NOT NULL,
    file_name TEXT NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    skipped_user_count INTEGER NOT NULL DEFAULT 0   -- transactions filtered out because they belong to a different cardholder
);
```

### 2. Config module (`backend/src/config.rs`)

- Read `DATABASE_URL` from environment variable
- Panic with clear message if not set

### 3. Database connection (`backend/src/db.rs`)

- Create a function `create_pool() -> PgPool` using `PgPoolOptions` with max 10 connections
- Create a function `run_migrations(pool: &PgPool)` that executes the CREATE TABLE statements above
- Log success after migrations

### 4. Rust models (`backend/src/models/`)

**`card.rs`:**
```rust
// Card — full row from cards table
// Fields: id (Uuid), code (String), label (String), color (String),
//   header_pattern (Option<String>), delimiter (String),
//   date_column (Option<String>),
//   date_format (Option<String>), description_column (Option<String>),
//   amount_column (Option<String>), debit_column (Option<String>),
//   credit_column (Option<String>), category_column (Option<String>),
//   member_column (Option<String>), skip_negative_amounts (bool),
//   created_at (DateTime<Utc>)
// Derive: Debug, Clone, Serialize, Deserialize, sqlx::FromRow

// NewCard — for creating a new card
// Fields: code, label, color, header_pattern, delimiter, date_column, date_format,
//   description_column, amount_column, debit_column, credit_column,
//   category_column, member_column, skip_negative_amounts
// All string fields are Option except code, label, color

// UpdateCard — for updating an existing card (all fields Optional)
```

**`transaction.rs`:**
```rust
// Transaction — full row from DB (for query responses)
// Fields: id (Uuid), date (NaiveDate), description (String), amount (f64),
//   category (String), card (String), card_label (String),
//   raw_data (Option<serde_json::Value>), hash (String),
//   created_at (DateTime<Utc>)
// Derive: Debug, Serialize, Deserialize, sqlx::FromRow

// NewTransaction — for inserts (no id, no created_at)
// Same fields minus id and created_at

// TransactionQuery — deserializable from query params
// Fields: card, category, start_date, end_date, search, sort_by, sort_order, page, per_page
// All Optional

// CategoryUpdate — { category: String }
// BulkCategoryUpdate — { ids: Vec<Uuid>, category: String }
```

**`import.rs`:**
```rust
// ImportRecord — full row from import_history
// Fields: id (Uuid), imported_at (DateTime<Utc>), card (String),
//   file_name (String), transaction_count (i32), duplicate_count (i32),
//   skipped_user_count (i32)
// Derive: Debug, Serialize, Deserialize, sqlx::FromRow
```

**`config.rs` (model, not the config.rs at root):**
```rust
// UserConfig — key-value pair from user_config table
// Fields: key (String), value (String), updated_at (DateTime<Utc>)
// Derive: Debug, Serialize, Deserialize, sqlx::FromRow
```

**Important note on `amount`:** The DB stores `NUMERIC(12,2)` but the Rust struct uses `f64`. When querying, cast in SQL: `amount::float8 as amount`. This avoids needing BigDecimal in the Rust model.

### 5. Update `main.rs`

- Call `db::create_pool()` to get the connection pool
- Call `db::run_migrations(&pool)` to create tables
- Pass `pool` as state to the router (will be used by routes in later prompts)
- Keep the health check endpoint
- Set up CORS (allow `http://localhost:3000`, any methods, any headers)
- Keep route stubs compiling (routes module can return an empty Router for now)

### 6. Route stubs (`backend/src/routes/mod.rs`)

```rust
pub mod transactions;
pub mod import;
pub mod cards;
pub mod config;

pub fn api_routes(pool: PgPool) -> Router {
    Router::new()
        // Empty for now — endpoints added in Prompt 3
        .with_state(pool)
}
```

The individual route files (`transactions.rs`, `import.rs`, `cards.rs`, `config.rs`) and service files (`csv_parser.rs`, `dedup.rs`) should be empty or have minimal stubs that compile.

## Verification

1. `docker-compose up --build` — backend connects to PostgreSQL, logs "Database migrations completed"
2. Verify tables exist:
   ```bash
   docker exec -it <postgres-container> psql -U ledgr -d ledgr -c '\dt'
   ```
   Should show `transactions` and `import_history` tables
3. `curl localhost:8080/health` still returns `ok`
4. No compilation errors
