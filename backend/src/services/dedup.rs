use sqlx::PgPool;
use std::collections::HashSet;

pub async fn get_existing_hashes(pool: &PgPool) -> HashSet<String> {
    let rows: Vec<(String,)> = sqlx::query_as("SELECT hash FROM transactions")
        .fetch_all(pool)
        .await
        .unwrap_or_default();

    rows.into_iter().map(|(h,)| h).collect()
}
