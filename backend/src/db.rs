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
        CREATE TABLE IF NOT EXISTS cards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#6B7280',
            header_pattern TEXT,
            delimiter TEXT NOT NULL DEFAULT ',',
            date_column TEXT,
            date_format TEXT DEFAULT 'MM/DD/YY',
            description_column TEXT,
            amount_column TEXT,
            debit_column TEXT,
            credit_column TEXT,
            category_column TEXT,
            member_column TEXT,
            skip_negative_amounts BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_cards_code ON cards(code);

        CREATE TABLE IF NOT EXISTS user_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

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
            duplicate_count INTEGER NOT NULL DEFAULT 0,
            skipped_user_count INTEGER NOT NULL DEFAULT 0
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to run migrations");

    // Seed preset cards
    sqlx::query(
        r#"
        INSERT INTO cards (code, label, color, header_pattern, delimiter, date_column, date_format, description_column, amount_column, debit_column, credit_column, category_column, member_column, skip_negative_amounts) VALUES
        ('amex', 'Amex Gold', '#C5A44E', 'card member,extended details', E'\t', 'Date', 'MM/DD/YY', 'Description', 'Amount', NULL, NULL, 'Category', 'Card Member', true),
        ('citi', 'Citi Costco', '#0066B2', 'debit,credit,member name', ',', 'Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', NULL, 'Member Name', false),
        ('capitalone', 'Capital One', '#D42427', 'posted date,card no', ',', 'Transaction Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', 'Category', NULL, false)
        ON CONFLICT (code) DO NOTHING;
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to seed preset cards");

    tracing::info!("Database migrations completed");
}
