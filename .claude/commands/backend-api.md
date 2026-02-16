# Backend API — Build Rust/Axum endpoints for Ledgr

You are building backend API endpoints for Ledgr, a personal finance dashboard using Rust (Axum) + PostgreSQL. Implement the following: $ARGUMENTS

## Architecture

```
backend/src/
├── main.rs          # Axum server setup, pool creation, route mounting
├── config.rs        # DATABASE_URL env config
├── db.rs            # PgPool creation + migration runner
├── models/
│   ├── mod.rs
│   ├── transaction.rs  # Transaction, NewTransaction, TransactionQuery structs
│   └── import.rs       # ImportRecord struct
├── routes/
│   ├── mod.rs          # api_routes() — merges sub-routers
│   ├── transactions.rs # GET/DELETE/PATCH transaction endpoints
│   ├── import.rs       # POST import, GET import-history
│   └── stats.rs        # GET summary/monthly/merchants/patterns
└── services/
    ├── mod.rs
    ├── csv_parser.rs   # Card detection + CSV parsing for 3 formats
    └── dedup.rs        # SHA256 hash-based deduplication
```

## Conventions

### Route Registration

```rust
// In routes/mod.rs
pub fn api_routes(pool: PgPool) -> Router {
    Router::new()
        .merge(transactions::routes())
        .merge(import::routes())
        .merge(stats::routes())
        .with_state(pool)
}

// In each route file
pub fn routes() -> Router<PgPool> {
    Router::new()
        .route("/api/transactions", get(list).delete(delete_all))
        // IMPORTANT: Register specific paths before parameterized paths
        .route("/api/transactions/bulk-category", patch(bulk_update))
        .route("/api/transactions/{id}", patch(update_category))
}
```

### Handler Pattern

```rust
async fn handler_name(
    State(pool): State<PgPool>,
    Query(params): Query<SomeQueryStruct>,  // for GET with query params
    Json(body): Json<SomeBodyStruct>,       // for POST/PATCH with body
) -> impl IntoResponse {
    // Business logic...
    Json(json!({ "data": result }))
}
```

### JSON Response Format

All responses follow: `{ data?, error?, meta? }`

```rust
// Success with data
Json(json!({ "data": transactions, "meta": { "page": page, "per_page": per_page, "total": total, "total_pages": total_pages } }))

// Success message
Json(json!({ "data": "All transactions deleted" }))

// Error
(StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid card type" })))
```

### SQLx Query Patterns

```rust
// Simple query
let rows = sqlx::query_as::<_, Transaction>("SELECT id, date, amount::float8 as amount, ... FROM transactions")
    .fetch_all(&pool).await?;

// Dynamic WHERE clause — build conditions and bind params incrementally
let mut conditions: Vec<String> = vec![];
let mut bind_values: Vec<String> = vec![];
let mut param_count = 0;

if let Some(card) = &params.card {
    param_count += 1;
    conditions.push(format!("card = ${}", param_count));
    bind_values.push(card.clone());
}
// ... build query string, then bind dynamically
```

**Important:** Always cast `amount::float8 as amount` in SELECT to match the `f64` Rust type (DB stores NUMERIC(12,2)).

### Model Structs

```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub date: NaiveDate,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub card: String,
    pub card_label: String,
    pub raw_data: Option<serde_json::Value>,
    pub hash: String,
    pub created_at: DateTime<Utc>,
}
```

### Error Handling

- Use `Result` types with appropriate status codes
- Return `{ "error": "message" }` for client errors (400, 404)
- Log internal errors, return generic 500 message to client
- Don't panic in handlers — always handle errors gracefully

### CORS

Backend must allow `http://localhost:3000` (the frontend dev server). This is configured in `main.rs` using `tower_http::cors`.

## Instructions

1. Read `CLAUDE.md` for full project conventions.
2. Read existing code in `backend/src/` before writing — don't overwrite working code.
3. All naming in `snake_case`.
4. Register specific routes before parameterized routes (e.g., `/bulk-category` before `/{id}`).
5. After writing code, run `docker-compose up --build` to verify compilation.
6. Test endpoints with `curl` commands against `localhost:8080`.
