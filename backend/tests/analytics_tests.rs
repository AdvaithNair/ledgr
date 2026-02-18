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
