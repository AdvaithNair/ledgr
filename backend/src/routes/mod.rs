pub mod budget;
pub mod cards;
pub mod config;
pub mod import;
pub mod transactions;

use axum::Router;
use sqlx::PgPool;

pub fn api_routes(pool: PgPool) -> Router {
    Router::new()
        .merge(transactions::routes())
        .merge(import::routes())
        .merge(cards::routes())
        .merge(config::routes())
        .merge(budget::routes())
        .with_state(pool)
}
