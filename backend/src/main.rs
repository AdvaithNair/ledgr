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
