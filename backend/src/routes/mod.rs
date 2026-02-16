pub mod transactions;
pub mod import;

use axum::Router;
use sqlx::PgPool;

pub fn api_routes(pool: PgPool) -> Router {
    Router::new()
        .merge(transactions::routes())
        .merge(import::routes())
        .with_state(pool)
}
