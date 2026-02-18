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
