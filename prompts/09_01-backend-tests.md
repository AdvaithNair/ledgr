# Prompt 09_01: Backend Integration & Unit Tests

## Goal
Add a comprehensive test suite to the Rust backend. Set up the infrastructure (lib.rs, dev-dependencies, test helpers, test database) so that every existing endpoint and service has tests, and every future endpoint/service can follow the same pattern with minimal boilerplate. After this prompt, `cargo test` runs a full suite against a real Postgres test database.

## Prerequisites
- Prompt 09 completed: All analytics endpoints exist and work
- Docker Compose is running (`docker compose up -d`) — tests connect to the same Postgres instance
- All existing endpoints verified working via curl

## Design Decisions

### Why integration tests over mocks?
The backend is primarily SQL queries + JSON serialization. Mocking the database would test nothing useful. Integration tests against real Postgres catch SQL errors, type mismatches, and migration issues that mocks would miss.

### Why `tower::ServiceExt` over HTTP client?
Using `axum::Router` directly with `tower::ServiceExt::oneshot()` is faster (no TCP), runs in-process, and is the canonical Axum testing pattern. No need for `reqwest` or spinning up a server.

### Test database strategy
Tests use a **dedicated test database** (`ledgr_test`) on the same Postgres instance. Each test function gets a **transaction that rolls back**, so tests are isolated and don't pollute each other. A shared setup function seeds baseline data once.

## Detailed Tasks

### 1. Extract Library Crate (`backend/src/lib.rs`)

The backend is currently a binary-only crate (`main.rs`). Integration tests in `backend/tests/` need access to internal modules. Create a `lib.rs` that re-exports everything, then slim down `main.rs` to just the entrypoint.

**Create `backend/src/lib.rs`:**
```rust
pub mod config;
pub mod db;
pub mod models;
pub mod routes;
pub mod services;
```

**Update `backend/src/main.rs`** to use the library crate instead of `mod` declarations:
```rust
use ledgr_backend::{db, routes};

use axum::{routing::get, Router};
use tower_http::classify::StatusInRangeAsFailures;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let pool = db::create_pool().await;
    db::run_migrations(&pool).await;

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<http::HeaderValue>().unwrap())
        .allow_methods(Any)
        .allow_headers(Any);

    let trace_layer = TraceLayer::new(
        StatusInRangeAsFailures::new(400..=599).into_make_classifier(),
    );

    let app = Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api", routes::api_routes(pool.clone()))
        .layer(cors)
        .layer(trace_layer);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("Backend listening on 0.0.0.0:8080");
    axum::serve(listener, app).await.unwrap();
}
```

**Important:** Every module that was `mod X;` in `main.rs` must now be `pub mod X;` in `lib.rs`. The modules themselves (`config.rs`, `db.rs`, etc.) stay where they are — no file moves needed. The `main.rs` just stops declaring them and imports from the library crate instead.

### 2. Add Dev Dependencies (`backend/Cargo.toml`)

Add a `[dev-dependencies]` section:

```toml
[dev-dependencies]
tower = { version = "0.4", features = ["util"] }
http-body-util = "0.1"
mime = "0.3"
```

These provide:
- `tower::ServiceExt` — `oneshot()` for sending requests to the Axum router in tests
- `http-body-util::BodyExt` — `collect()` / `to_bytes()` for reading response bodies
- `mime` — content type constants for multipart and JSON

### 3. Test Helper Module (`backend/tests/common/mod.rs`)

Create the test helper that all integration test files will use.

**Create `backend/tests/common/mod.rs`:**
```rust
use axum::{body::Body, http::Request, Router};
use http_body_util::BodyExt;
use sqlx::PgPool;
use tower::ServiceExt;

use ledgr_backend::{db, routes};

/// Create a test database pool pointing at `ledgr_test`.
/// Falls back to `DATABASE_URL` env var if set (for CI), otherwise uses the
/// Docker Compose default with `ledgr_test` as the database name.
pub async fn test_pool() -> PgPool {
    let url = std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ledgr:ledgr@localhost:5432/ledgr_test".to_string()
    });

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("Failed to connect to test database. Is Postgres running?");

    db::run_migrations(&pool).await;

    pool
}

/// Build the full Axum app (same as production, minus CORS/tracing layers).
pub fn app(pool: PgPool) -> Router {
    Router::new().nest("/api", routes::api_routes(pool))
}

/// Clean all data from test tables (call at the start of each test for isolation).
pub async fn clean(pool: &PgPool) {
    sqlx::query("DELETE FROM import_history").execute(pool).await.unwrap();
    sqlx::query("DELETE FROM transactions").execute(pool).await.unwrap();
    // Don't delete cards — they're seeded by migration 002 and tests need them
}

/// Seed a set of test transactions spanning multiple months, categories, and cards.
/// Returns the number of inserted rows.
pub async fn seed_transactions(pool: &PgPool) -> i64 {
    // Use direct SQL inserts — bypasses import logic to create controlled test data.
    // Spans 2025-10 through 2026-02 across 3 cards and 5 categories.
    let rows = sqlx::query(
        "INSERT INTO transactions (date, description, amount, category, card, card_label, hash, merchant_normalized) VALUES
        -- 2025-10
        ('2025-10-05', 'WHOLE FOODS MKT #1234', 87.32, 'Groceries', 'amex', 'Amex Gold', 'test_hash_001', 'WHOLE FOODS'),
        ('2025-10-10', 'STARBUCKS STORE 5678', 5.75, 'Dining', 'amex', 'Amex Gold', 'test_hash_002', 'STARBUCKS'),
        ('2025-10-15', 'NETFLIX.COM', 15.99, 'Subscriptions', 'citi', 'Citi Costco', 'test_hash_003', 'NETFLIX.COM'),
        ('2025-10-20', 'CHEVRON GAS', 45.00, 'Gas', 'citi', 'Citi Costco', 'test_hash_004', 'CHEVRON GAS'),
        ('2025-10-25', 'AMAZON MKTPLACE', 29.99, 'Shopping', 'capitalone', 'Capital One', 'test_hash_005', 'AMAZON'),
        -- 2025-11
        ('2025-11-03', 'WHOLE FOODS MKT #1234', 92.10, 'Groceries', 'amex', 'Amex Gold', 'test_hash_006', 'WHOLE FOODS'),
        ('2025-11-08', 'STARBUCKS STORE 9012', 6.25, 'Dining', 'amex', 'Amex Gold', 'test_hash_007', 'STARBUCKS'),
        ('2025-11-15', 'NETFLIX.COM', 15.99, 'Subscriptions', 'citi', 'Citi Costco', 'test_hash_008', 'NETFLIX.COM'),
        ('2025-11-18', 'COSTCO WHSE #345', 156.78, 'Groceries', 'citi', 'Citi Costco', 'test_hash_009', 'COSTCO'),
        ('2025-11-22', 'AMAZON MKTPLACE', 45.50, 'Shopping', 'capitalone', 'Capital One', 'test_hash_010', 'AMAZON'),
        -- 2025-12
        ('2025-12-01', 'WHOLE FOODS MKT #1234', 105.20, 'Groceries', 'amex', 'Amex Gold', 'test_hash_011', 'WHOLE FOODS'),
        ('2025-12-05', 'STARBUCKS STORE 5678', 5.50, 'Dining', 'amex', 'Amex Gold', 'test_hash_012', 'STARBUCKS'),
        ('2025-12-10', 'TARGET STORE', 200.00, 'Shopping', 'citi', 'Citi Costco', 'test_hash_013', 'TARGET STORE'),
        ('2025-12-15', 'NETFLIX.COM', 15.99, 'Subscriptions', 'citi', 'Citi Costco', 'test_hash_014', 'NETFLIX.COM'),
        ('2025-12-20', 'CHEVRON GAS', 48.00, 'Gas', 'capitalone', 'Capital One', 'test_hash_015', 'CHEVRON GAS'),
        -- 2026-01
        ('2026-01-05', 'WHOLE FOODS MKT #1234', 95.40, 'Groceries', 'amex', 'Amex Gold', 'test_hash_016', 'WHOLE FOODS'),
        ('2026-01-10', 'STARBUCKS STORE 5678', 6.00, 'Dining', 'amex', 'Amex Gold', 'test_hash_017', 'STARBUCKS'),
        ('2026-01-12', 'NORDSTROM', 89.00, 'Shopping', 'citi', 'Citi Costco', 'test_hash_018', 'NORDSTROM'),
        ('2026-01-15', 'NETFLIX.COM', 15.99, 'Subscriptions', 'citi', 'Citi Costco', 'test_hash_019', 'NETFLIX.COM'),
        ('2026-01-18', 'CHEVRON GAS', 42.00, 'Gas', 'capitalone', 'Capital One', 'test_hash_020', 'CHEVRON GAS'),
        -- 2026-02 (current month — partial)
        ('2026-02-03', 'WHOLE FOODS MKT #1234', 110.00, 'Groceries', 'amex', 'Amex Gold', 'test_hash_021', 'WHOLE FOODS'),
        ('2026-02-05', 'STARBUCKS STORE 5678', 5.25, 'Dining', 'amex', 'Amex Gold', 'test_hash_022', 'STARBUCKS'),
        ('2026-02-08', 'AMAZON MKTPLACE', 350.00, 'Shopping', 'capitalone', 'Capital One', 'test_hash_023', 'AMAZON'),
        ('2026-02-10', 'UBER *TRIP', 15.50, 'Travel', 'capitalone', 'Capital One', 'test_hash_024', 'UBER'),
        ('2026-02-12', 'NETFLIX.COM', 15.99, 'Subscriptions', 'citi', 'Citi Costco', 'test_hash_025', 'NETFLIX.COM')
        ON CONFLICT DO NOTHING"
    )
    .execute(pool)
    .await
    .unwrap()
    .rows_affected();

    rows as i64
}

/// Send a GET request to the app and return (status, parsed JSON body).
pub async fn get_json(app: &Router, path: &str) -> (u16, serde_json::Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(path)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status().as_u16();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::json!(null));
    (status, json)
}

/// Send a DELETE request to the app and return (status, parsed JSON body).
pub async fn delete_json(app: &Router, path: &str) -> (u16, serde_json::Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(path)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status().as_u16();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::json!(null));
    (status, json)
}

/// Send a PATCH request with a JSON body.
pub async fn patch_json(app: &Router, path: &str, body: serde_json::Value) -> (u16, serde_json::Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status().as_u16();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::json!(null));
    (status, json)
}

/// Send a PUT request with a JSON body.
pub async fn put_json(app: &Router, path: &str, body: serde_json::Value) -> (u16, serde_json::Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status().as_u16();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::json!(null));
    (status, json)
}
```

### 4. Create Test Database Setup Script

**Create `backend/scripts/setup_test_db.sh`:**
```bash
#!/usr/bin/env bash
set -e

# Create the test database if it doesn't exist
# Connects to the default 'ledgr' database to run CREATE DATABASE
docker compose exec -T db psql -U ledgr -d ledgr -c \
  "SELECT 'CREATE DATABASE ledgr_test OWNER ledgr' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ledgr_test')" \
  | docker compose exec -T db psql -U ledgr -d ledgr 2>/dev/null || true

# Simpler fallback — just try to create it, ignore if exists
docker compose exec -T db psql -U ledgr -d ledgr -c "CREATE DATABASE ledgr_test OWNER ledgr;" 2>/dev/null || true

echo "✓ Test database 'ledgr_test' ready"
```

Make it executable: `chmod +x backend/scripts/setup_test_db.sh`

### 5. Integration Tests — Stats Endpoints (`backend/tests/stats_tests.rs`)

```rust
mod common;

use common::*;

#[tokio::test]
async fn test_summary_returns_expected_shape() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/summary").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    assert!(data["total_spent"].as_f64().unwrap() > 0.0);
    assert!(data["transaction_count"].as_i64().unwrap() > 0);
    assert!(data["this_month"].is_number());
    assert!(data["last_month"].is_number());
    assert!(data["avg_monthly"].is_number());
    assert!(data["daily_rate"].is_number());
    assert!(data["projected_month_total"].is_number());
    // mom_change_pct and vs_avg_pct can be null or number
    assert!(data["mom_change_pct"].is_number() || data["mom_change_pct"].is_null());
    assert!(data["vs_avg_pct"].is_number() || data["vs_avg_pct"].is_null());

    // by_card and by_category arrays should have avg_amount
    let by_card = data["by_card"].as_array().unwrap();
    assert!(!by_card.is_empty());
    assert!(by_card[0]["avg_amount"].is_number());

    let by_category = data["by_category"].as_array().unwrap();
    assert!(!by_category.is_empty());
    assert!(by_category[0]["avg_amount"].is_number());
}

#[tokio::test]
async fn test_summary_empty_db() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/summary").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"]["total_spent"].as_f64().unwrap(), 0.0);
    assert_eq!(json["data"]["transaction_count"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_monthly_returns_enhanced_fields() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/monthly").await;
    assert_eq!(status, 200);

    let monthly = json["data"]["monthly"].as_array().unwrap();
    assert!(monthly.len() >= 2, "Should have multiple months of data");

    // First month has no prev_total
    assert!(monthly[0]["prev_total"].is_null());
    assert!(monthly[0]["growth_pct"].is_null());
    assert!(monthly[0]["rolling_3mo_avg"].is_number());

    // Second month should have prev_total and growth_pct
    if monthly.len() > 1 {
        assert!(monthly[1]["prev_total"].is_number());
        assert!(monthly[1]["growth_pct"].is_number());
    }

    // monthly_by_card and monthly_by_category should also exist
    assert!(json["data"]["monthly_by_card"].is_array());
    assert!(json["data"]["monthly_by_category"].is_array());
}

#[tokio::test]
async fn test_merchants_returns_normalized_names() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/merchants").await;
    assert_eq!(status, 200);

    let merchants = json["data"].as_array().unwrap();
    assert!(!merchants.is_empty());

    // Check enhanced fields exist on every merchant
    for m in merchants {
        assert!(m["merchant"].is_string());
        assert!(m["total"].is_number());
        assert!(m["count"].is_number());
        assert!(m["avg_amount"].is_number());
        assert!(m["first_seen"].is_string());
        assert!(m["last_seen"].is_string());
        assert!(m["active_months"].is_number());
        assert!(m["monthly_frequency"].is_number());
    }

    // WHOLE FOODS should appear as normalized name (not "WHOLE FOODS MKT #1234")
    let names: Vec<&str> = merchants.iter().map(|m| m["merchant"].as_str().unwrap()).collect();
    assert!(names.contains(&"WHOLE FOODS"), "Expected normalized merchant name 'WHOLE FOODS', got: {:?}", names);
}

#[tokio::test]
async fn test_patterns_returns_day_data() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/patterns").await;
    assert_eq!(status, 200);

    assert!(json["data"]["day_of_week"].is_array());
    assert!(json["data"]["day_of_month"].is_array());

    let dow = json["data"]["day_of_week"].as_array().unwrap();
    for entry in dow {
        assert!(entry["day"].is_string());
        assert!(entry["day_num"].is_number());
        assert!(entry["total"].is_number());
        assert!(entry["count"].is_number());
    }
}
```

### 6. Integration Tests — Analytics Endpoints (`backend/tests/analytics_tests.rs`)

```rust
mod common;

use common::*;

#[tokio::test]
async fn test_recurring_detection() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/recurring").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    assert!(data["recurring"].is_array());
    assert!(data["total_monthly_recurring"].is_number());
    assert!(data["total_annual_recurring"].is_number());

    // Netflix appears every month in seed data — should be detected as recurring
    let recurring = data["recurring"].as_array().unwrap();
    let netflix = recurring.iter().find(|r| {
        r["merchant"].as_str().unwrap_or("").contains("NETFLIX")
    });
    if let Some(n) = netflix {
        assert_eq!(n["status"].as_str().unwrap(), "active");
        assert!(n["avg_amount"].as_f64().unwrap() > 0.0);
        assert!(n["estimated_annual"].as_f64().unwrap() > 0.0);
    }
}

#[tokio::test]
async fn test_anomalies_returns_valid_shape() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/anomalies").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    assert!(data["category_anomalies"].is_array());
    assert!(data["transaction_anomalies"].is_array());

    // The $350 Amazon purchase in Feb should be a transaction anomaly
    let txn_anomalies = data["transaction_anomalies"].as_array().unwrap();
    for a in txn_anomalies {
        assert!(a["id"].is_string());
        assert!(a["date"].is_string());
        assert!(a["amount"].is_number());
        assert!(a["times_avg"].as_f64().unwrap() > 2.0);
        assert!(a["message"].is_string());
    }
}

#[tokio::test]
async fn test_forecast_projections() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/forecast").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    // Current month status
    assert!(data["current_month"]["spent_so_far"].is_number());
    assert!(data["current_month"]["days_elapsed"].is_number());
    assert!(data["current_month"]["days_remaining"].is_number());
    assert!(data["current_month"]["days_in_month"].is_number());

    // Projections
    assert!(data["projections"]["linear"].is_number());
    assert!(data["projections"]["day_weighted"].is_number());
    assert!(data["projections"]["ewma"].is_number());
    assert!(data["projections"]["recommended"].is_number());

    // Trajectory
    let trajectory = data["trajectory"].as_str().unwrap();
    assert!(
        ["below_average", "near_average", "above_average", "well_above_average"].contains(&trajectory),
        "Unexpected trajectory: {}", trajectory
    );

    // Category forecasts
    assert!(data["category_forecasts"].is_array());
    for cf in data["category_forecasts"].as_array().unwrap() {
        assert!(cf["category"].is_string());
        assert!(cf["spent_so_far"].is_number());
        assert!(cf["projected"].is_number());
        let trend = cf["trend"].as_str().unwrap();
        assert!(["up", "down", "stable"].contains(&trend));
    }
}

#[tokio::test]
async fn test_habits_all_detectors() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/habits").await;
    assert_eq!(status, 200);

    let data = &json["data"];

    // Impulse spending
    let impulse = &data["impulse_spending"];
    assert!(impulse["score"].is_number());
    assert!(impulse["label"].is_string());
    assert!(impulse["small_transaction_pct"].is_number());
    assert!(impulse["message"].is_string());

    // Category creep (may be empty with limited data)
    assert!(data["category_creep"].is_array());

    // Weekend splurge
    let weekend = &data["weekend_splurge"];
    assert!(weekend["ratio"].is_number());
    assert!(weekend["label"].is_string());

    // Subscription bloat
    let subs = &data["subscription_bloat"];
    assert!(subs["count"].is_number());
    assert!(subs["total_monthly"].is_number());
    assert!(subs["potentially_forgotten"].is_array());

    // Merchant concentration
    let conc = &data["merchant_concentration"];
    assert!(conc["hhi"].is_number());
    assert!(conc["top_merchant"].is_string());
    assert!(conc["label"].is_string());
}

#[tokio::test]
async fn test_daily_spending_with_date_range() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/daily?start_date=2025-10-01&end_date=2026-02-28").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    assert!(!data.is_empty());

    for entry in data {
        assert!(entry["date"].is_string());
        assert!(entry["total"].as_f64().unwrap() > 0.0);
        assert!(entry["count"].as_i64().unwrap() > 0);
    }

    // Verify date range is respected
    let first_date = data.first().unwrap()["date"].as_str().unwrap();
    let last_date = data.last().unwrap()["date"].as_str().unwrap();
    assert!(first_date >= "2025-10-01");
    assert!(last_date <= "2026-02-28");
}

#[tokio::test]
async fn test_daily_default_range() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    // No query params — should default to last 365 days
    let (status, json) = get_json(&app, "/api/stats/daily").await;
    assert_eq!(status, 200);
    assert!(json["data"].is_array());
}

#[tokio::test]
async fn test_category_deep_dive() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/category/Groceries").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    assert_eq!(data["category"].as_str().unwrap(), "Groceries");
    assert!(data["total_spent"].as_f64().unwrap() > 0.0);
    assert!(data["transaction_count"].as_i64().unwrap() > 0);
    assert!(data["avg_amount"].is_number());

    // Monthly trend
    let trend = data["monthly_trend"].as_array().unwrap();
    assert!(!trend.is_empty());
    assert!(trend[0]["month"].is_string());
    assert!(trend[0]["total"].is_number());

    // Top merchants within category
    let merchants = data["top_merchants"].as_array().unwrap();
    assert!(!merchants.is_empty());
    assert!(merchants[0]["merchant"].is_string());

    // Day of week
    assert!(data["day_of_week"].is_array());

    // Recent transactions
    let recent = data["recent_transactions"].as_array().unwrap();
    assert!(!recent.is_empty());
    assert!(recent[0]["id"].is_string());
    assert!(recent[0]["date"].is_string());
    assert!(recent[0]["amount"].is_number());
}

#[tokio::test]
async fn test_category_deep_dive_nonexistent() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/category/FakeCategory").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"]["total_spent"].as_f64().unwrap(), 0.0);
    assert_eq!(json["data"]["transaction_count"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_insights_returns_ranked_list() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/insights").await;
    assert_eq!(status, 200);

    let insights = json["data"].as_array().unwrap();
    // Should have at least 1 insight with seeded data
    assert!(!insights.is_empty(), "Expected at least one insight from seeded data");
    assert!(insights.len() <= 8, "Should return at most 8 insights");

    for insight in insights {
        assert!(insight["type"].is_string());
        assert!(insight["severity"].is_string());
        assert!(insight["icon"].is_string());
        assert!(insight["title"].is_string());
        assert!(insight["message"].is_string());

        let severity = insight["severity"].as_str().unwrap();
        assert!(
            ["low", "medium", "high"].contains(&severity),
            "Unexpected severity: {}", severity
        );
    }
}

#[tokio::test]
async fn test_insights_empty_db() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/insights").await;
    assert_eq!(status, 200);
    assert!(json["data"].as_array().unwrap().is_empty());
}
```

### 7. Integration Tests — CRUD Endpoints (`backend/tests/crud_tests.rs`)

```rust
mod common;

use common::*;

#[tokio::test]
async fn test_transactions_list_empty() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"].as_array().unwrap().len(), 0);
    assert_eq!(json["meta"]["total"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_transactions_list_with_data() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?per_page=10").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    assert!(!data.is_empty());
    assert!(data.len() <= 10);

    // Check each transaction has required fields
    for txn in data {
        assert!(txn["id"].is_string());
        assert!(txn["date"].is_string());
        assert!(txn["description"].is_string());
        assert!(txn["amount"].is_number());
        assert!(txn["category"].is_string());
        assert!(txn["card"].is_string());
    }

    // Check pagination meta
    assert!(json["meta"]["page"].as_i64().unwrap() >= 1);
    assert!(json["meta"]["per_page"].as_i64().unwrap() == 10);
    assert!(json["meta"]["total"].as_i64().unwrap() > 0);
}

#[tokio::test]
async fn test_transactions_filter_by_card() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?card=amex").await;
    assert_eq!(status, 200);

    for txn in json["data"].as_array().unwrap() {
        assert_eq!(txn["card"].as_str().unwrap(), "amex");
    }
}

#[tokio::test]
async fn test_transactions_filter_by_category() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?category=Dining").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    assert!(!data.is_empty());
    for txn in data {
        assert_eq!(txn["category"].as_str().unwrap(), "Dining");
    }
}

#[tokio::test]
async fn test_transactions_sort_by_amount() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?sort_by=amount&sort_order=desc").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    let amounts: Vec<f64> = data.iter().map(|t| t["amount"].as_f64().unwrap()).collect();
    for w in amounts.windows(2) {
        assert!(w[0] >= w[1], "Expected descending order: {} >= {}", w[0], w[1]);
    }
}

#[tokio::test]
async fn test_transactions_pagination() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool.clone());

    let (_, page1) = get_json(&app, "/api/transactions?per_page=5&page=1").await;
    let app2 = common::app(pool);
    let (_, page2) = get_json(&app2, "/api/transactions?per_page=5&page=2").await;

    let ids1: Vec<&str> = page1["data"].as_array().unwrap().iter().map(|t| t["id"].as_str().unwrap()).collect();
    let ids2: Vec<&str> = page2["data"].as_array().unwrap().iter().map(|t| t["id"].as_str().unwrap()).collect();

    // Pages should not overlap
    for id in &ids1 {
        assert!(!ids2.contains(id), "Page 2 contained ID from page 1: {}", id);
    }
}

#[tokio::test]
async fn test_update_category() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;

    // Get a transaction ID
    let app = app(pool.clone());
    let (_, json) = get_json(&app, "/api/transactions?per_page=1").await;
    let id = json["data"][0]["id"].as_str().unwrap();

    let app2 = common::app(pool);
    let (status, _) = patch_json(
        &app2,
        &format!("/api/transactions/{}", id),
        serde_json::json!({ "category": "NewCategory" }),
    ).await;
    assert_eq!(status, 200);
}

#[tokio::test]
async fn test_delete_all_transactions() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool.clone());

    let (status, _) = delete_json(&app, "/api/transactions").await;
    assert_eq!(status, 200);

    // Verify empty
    let app2 = common::app(pool);
    let (_, json) = get_json(&app2, "/api/transactions").await;
    assert_eq!(json["meta"]["total"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_cards_list() {
    let pool = test_pool().await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/cards").await;
    assert_eq!(status, 200);

    // Seeded by migration 002 — should have 3 preset cards
    let cards = json["data"].as_array().unwrap();
    assert!(cards.len() >= 3, "Expected at least 3 preset cards");

    let codes: Vec<&str> = cards.iter().map(|c| c["code"].as_str().unwrap()).collect();
    assert!(codes.contains(&"amex"));
    assert!(codes.contains(&"citi"));
    assert!(codes.contains(&"capitalone"));
}

#[tokio::test]
async fn test_config_get_and_put() {
    let pool = test_pool().await;
    let app = app(pool.clone());

    // PUT a config value
    let (status, _) = put_json(
        &app,
        "/api/config",
        serde_json::json!({ "test_key": "test_value" }),
    ).await;
    assert_eq!(status, 200);

    // GET it back
    let app2 = common::app(pool);
    let (status, json) = get_json(&app2, "/api/config").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"]["test_key"].as_str().unwrap(), "test_value");
}

#[tokio::test]
async fn test_import_history_empty() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/import-history").await;
    assert_eq!(status, 200);
    assert!(json["data"].as_array().unwrap().is_empty());
}
```

### 8. Unit Tests — Merchant Normalizer (`backend/src/services/merchant_normalizer.rs`)

Add a `#[cfg(test)]` module at the bottom of `merchant_normalizer.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_uppercase_and_trim() {
        assert_eq!(normalize_merchant("  starbucks  "), "STARBUCKS");
    }

    #[test]
    fn test_strips_store_numbers() {
        assert_eq!(normalize_merchant("TARGET STORE #12345"), "TARGET STORE");
        assert_eq!(normalize_merchant("WALMART STORE 9876"), "WALMART");
    }

    #[test]
    fn test_strips_payment_prefixes() {
        assert_eq!(normalize_merchant("SQ *COFFEE SHOP"), "COFFEE SHOP");
        assert_eq!(normalize_merchant("TST*RESTAURANT"), "RESTAURANT");
        assert_eq!(normalize_merchant("PP*EBAY PURCHASE"), "EBAY PURCHASE");
        assert_eq!(normalize_merchant("PAYPAL *VENDOR"), "VENDOR");
        assert_eq!(normalize_merchant("VENMO *JOHN"), "JOHN");
        assert_eq!(normalize_merchant("ZELLE *PAYMENT"), "PAYMENT");
    }

    #[test]
    fn test_strips_reference_codes() {
        assert_eq!(normalize_merchant("UBER *ABCDEF123"), "UBER");
    }

    #[test]
    fn test_strips_trailing_location() {
        assert_eq!(normalize_merchant("COSTCO WHOLESALE, CA 90210"), "COSTCO");
    }

    #[test]
    fn test_alias_amazon() {
        assert_eq!(normalize_merchant("AMZN Mktpl US"), "AMAZON");
        assert_eq!(normalize_merchant("AMAZON.COM PURCHASE"), "AMAZON");
        assert_eq!(normalize_merchant("AMZN MKTPL US*AB1234"), "AMAZON");
    }

    #[test]
    fn test_alias_walmart() {
        assert_eq!(normalize_merchant("WM SUPERCENTER #1234"), "WALMART");
        assert_eq!(normalize_merchant("WAL-MART STORE 5678"), "WALMART");
    }

    #[test]
    fn test_alias_whole_foods() {
        assert_eq!(normalize_merchant("WHOLEFDS MKT 1234"), "WHOLE FOODS");
        assert_eq!(normalize_merchant("WHOLE FOODS MKT #9876"), "WHOLE FOODS");
    }

    #[test]
    fn test_alias_costco() {
        assert_eq!(normalize_merchant("COSTCO WHSE #123"), "COSTCO");
        assert_eq!(normalize_merchant("COSTCO WHOLESALE, WA 98101"), "COSTCO");
    }

    #[test]
    fn test_alias_fast_food() {
        assert_eq!(normalize_merchant("MCDONALD'S #12345"), "MCDONALDS");
        assert_eq!(normalize_merchant("DUNKIN #456"), "DUNKIN DONUTS");
        assert_eq!(normalize_merchant("DD/BR #789"), "DUNKIN DONUTS");
    }

    #[test]
    fn test_no_alias_passthrough() {
        assert_eq!(normalize_merchant("NORDSTROM"), "NORDSTROM");
        assert_eq!(normalize_merchant("Target"), "TARGET");
    }

    #[test]
    fn test_collapses_whitespace() {
        assert_eq!(normalize_merchant("SOME    STORE   NAME"), "SOME STORE NAME");
    }

    #[test]
    fn test_empty_input() {
        assert_eq!(normalize_merchant(""), "");
    }
}
```

### 9. Unit Tests — CSV Parser Helpers (inside `backend/src/services/csv_parser.rs`)

Add a `#[cfg(test)]` module at the bottom of `csv_parser.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_detect_delimiter_csv() {
        assert_eq!(auto_detect_delimiter("a,b,c\n1,2,3"), b',');
    }

    #[test]
    fn test_auto_detect_delimiter_tsv() {
        assert_eq!(auto_detect_delimiter("a\tb\tc\n1\t2\t3"), b'\t');
    }

    #[test]
    fn test_parse_date_us_format() {
        let d = parse_date("01/15/26", "MM/DD/YY").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_iso_format() {
        let d = parse_date("2026-01-15", "YYYY-MM-DD").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_us_four_digit_year() {
        let d = parse_date("01/15/2026", "MM/DD/YYYY").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_invalid() {
        assert!(parse_date("not-a-date", "MM/DD/YY").is_err());
    }

    #[test]
    fn test_find_column_case_insensitive() {
        let headers = vec!["Date".to_string(), "Description".to_string(), "Amount".to_string()];
        assert_eq!(find_column(&headers, Some("date")), Some(0));
        assert_eq!(find_column(&headers, Some("DESCRIPTION")), Some(1));
        assert_eq!(find_column(&headers, None), None);
        assert_eq!(find_column(&headers, Some("missing")), None);
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let h1 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        let h2 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_compute_hash_different_inputs() {
        let h1 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        let h2 = compute_hash("2026-01-16", "STARBUCKS", 5.75, "amex");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_fuzzy_name_match_exact() {
        assert!(fuzzy_name_match("John Doe", "John Doe"));
    }

    #[test]
    fn test_fuzzy_name_match_containment() {
        assert!(fuzzy_name_match("John", "John Doe"));
        assert!(fuzzy_name_match("John Doe", "John"));
    }

    #[test]
    fn test_fuzzy_name_match_lastname_first() {
        assert!(fuzzy_name_match("John Doe", "DOE, JOHN"));
    }

    #[test]
    fn test_fuzzy_name_match_no_match() {
        assert!(!fuzzy_name_match("John Doe", "Jane Smith"));
    }

    #[test]
    fn test_fuzzy_name_match_empty() {
        assert!(!fuzzy_name_match("", "John"));
        assert!(!fuzzy_name_match("John", ""));
    }

    #[test]
    fn test_categorize_dining() {
        assert_eq!(categorize("STARBUCKS COFFEE"), "Dining");
        assert_eq!(categorize("MCDONALD'S"), "Dining");
        assert_eq!(categorize("CHIPOTLE"), "Dining");
    }

    #[test]
    fn test_categorize_groceries() {
        assert_eq!(categorize("COSTCO WHOLESALE"), "Groceries");
        assert_eq!(categorize("WHOLE FOODS MARKET"), "Groceries");
        assert_eq!(categorize("TRADER JOE'S"), "Groceries");
    }

    #[test]
    fn test_categorize_uncategorized() {
        assert_eq!(categorize("RANDOM MERCHANT XYZ"), "Uncategorized");
    }

    #[test]
    fn test_map_csv_category_known() {
        assert_eq!(map_csv_category("Restaurant-Bar & Café"), "Dining");
        assert_eq!(map_csv_category("Merchandise & Supplies-Groceries"), "Groceries");
        assert_eq!(map_csv_category("Transportation-Fuel"), "Gas");
    }

    #[test]
    fn test_map_csv_category_passthrough() {
        assert_eq!(map_csv_category("Custom Category"), "Custom Category");
    }
}
```

### 10. Running Tests

**One-time setup (creates the test database):**
```bash
bash backend/scripts/setup_test_db.sh
```

**Run all tests:**
```bash
cd backend && cargo test
```

**Run only unit tests (no database needed for these):**
```bash
cd backend && cargo test --lib
```

**Run only integration tests:**
```bash
cd backend && cargo test --test stats_tests --test analytics_tests --test crud_tests
```

**Run a specific test:**
```bash
cd backend && cargo test test_merchants_returns_normalized_names
```

## Convention: Adding Tests for Future Endpoints

When you add a new endpoint in a future prompt, follow this pattern:

1. **If it's a new route handler in `routes/`:**
   - Add an integration test in the appropriate `backend/tests/*_tests.rs` file
   - Test both the happy path (with seeded data) and the empty database case
   - Verify the response shape (all expected fields present, correct types)
   - If the endpoint takes parameters, test with valid and edge-case inputs

2. **If it's a new service function in `services/`:**
   - Add unit tests in a `#[cfg(test)] mod tests` block at the bottom of the file
   - Test edge cases: empty input, zero values, boundary conditions

3. **If it needs new seed data:**
   - Add rows to `seed_transactions()` in `backend/tests/common/mod.rs`
   - Keep the total manageable (under 50 rows) — tests should be fast

4. **Test naming convention:**
   - `test_<endpoint>_<scenario>` for integration tests (e.g., `test_forecast_empty_db`)
   - `test_<function>_<scenario>` for unit tests (e.g., `test_normalize_merchant_strips_prefix`)

## Verification

```bash
# 1. Set up test database (one-time)
bash backend/scripts/setup_test_db.sh

# 2. Run all tests
cd backend && cargo test 2>&1

# Expected: All tests pass. No test should take more than 5 seconds.
# Unit tests (merchant_normalizer, csv_parser) should pass without a database.
# Integration tests require the Docker Compose Postgres to be running.

# 3. Verify test count
cd backend && cargo test 2>&1 | grep "test result"
# Expected: 30+ tests, 0 failures

# 4. Verify unit tests run independently
cd backend && cargo test --lib 2>&1 | grep "test result"
# Expected: 20+ tests, 0 failures
```
