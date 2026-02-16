use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::config;

pub async fn create_pool() -> PgPool {
    let database_url = config::database_url();
    PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database")
}

pub async fn run_migrations(pool: &PgPool) {
    // Create tables if they don't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL,
            description TEXT NOT NULL,
            amount NUMERIC(12,2) NOT NULL,
            category TEXT NOT NULL DEFAULT 'Uncategorized',
            card TEXT NOT NULL,
            card_label TEXT NOT NULL,
            raw_data JSONB,
            hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(card);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
        CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);

        CREATE TABLE IF NOT EXISTS import_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            card TEXT NOT NULL,
            file_name TEXT NOT NULL,
            transaction_count INTEGER NOT NULL DEFAULT 0,
            duplicate_count INTEGER NOT NULL DEFAULT 0
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to run migrations");

    tracing::info!("Database migrations completed");
}
