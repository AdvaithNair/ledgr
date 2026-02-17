use sqlx::PgPool;
use std::collections::HashSet;

pub async fn get_existing_hashes(pool: &PgPool) -> HashSet<String> {
    let rows: Vec<(String,)> = match sqlx::query_as("SELECT hash FROM transactions")
        .fetch_all(pool)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Failed to fetch existing transaction hashes: {e}");
            Vec::new()
        }
    };

    rows.into_iter().map(|(h,)| h).collect()
}
