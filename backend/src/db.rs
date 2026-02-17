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
    sqlx::migrate!()
        .run(pool)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Database migrations completed");
}
