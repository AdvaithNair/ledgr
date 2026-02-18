mod common;

use common::*;

#[tokio::test]
async fn test_summary_returns_expected_shape() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/summary").await;
    assert_eq!(status, 200);

    let data = &json["data"];
    assert!(data["total_spent"].as_f64().unwrap() > 0.0);
    assert!(data["transaction_count"].as_i64().unwrap() > 0);
    assert!(data["this_month"].is_number());
    assert!(data["last_month"].is_number());
    assert!(data["avg_monthly"].is_number());
    assert!(data["daily_rate"].is_number());
    assert!(data["projected_month_total"].is_number());
    // mom_change_pct and vs_avg_pct can be null or number
    assert!(data["mom_change_pct"].is_number() || data["mom_change_pct"].is_null());
    assert!(data["vs_avg_pct"].is_number() || data["vs_avg_pct"].is_null());

    // by_card and by_category arrays should have avg_amount
    let by_card = data["by_card"].as_array().unwrap();
    assert!(!by_card.is_empty());
    assert!(by_card[0]["avg_amount"].is_number());

    let by_category = data["by_category"].as_array().unwrap();
    assert!(!by_category.is_empty());
    assert!(by_category[0]["avg_amount"].is_number());
}

#[tokio::test]
async fn test_summary_empty_db() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/summary").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"]["total_spent"].as_f64().unwrap(), 0.0);
    assert_eq!(json["data"]["transaction_count"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_monthly_returns_enhanced_fields() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/monthly").await;
    assert_eq!(status, 200);

    let monthly = json["data"]["monthly"].as_array().unwrap();
    assert!(monthly.len() >= 2, "Should have multiple months of data");

    // First month has no prev_total
    assert!(monthly[0]["prev_total"].is_null());
    assert!(monthly[0]["growth_pct"].is_null());
    assert!(monthly[0]["rolling_3mo_avg"].is_number());

    // Second month should have prev_total and growth_pct
    if monthly.len() > 1 {
        assert!(monthly[1]["prev_total"].is_number());
        assert!(monthly[1]["growth_pct"].is_number());
    }

    // monthly_by_card and monthly_by_category should also exist
    assert!(json["data"]["monthly_by_card"].is_array());
    assert!(json["data"]["monthly_by_category"].is_array());
}

#[tokio::test]
async fn test_merchants_returns_normalized_names() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/merchants").await;
    assert_eq!(status, 200);

    let merchants = json["data"].as_array().unwrap();
    assert!(!merchants.is_empty());

    // Check enhanced fields exist on every merchant
    for m in merchants {
        assert!(m["merchant"].is_string());
        assert!(m["total"].is_number());
        assert!(m["count"].is_number());
        assert!(m["avg_amount"].is_number());
        assert!(m["first_seen"].is_string());
        assert!(m["last_seen"].is_string());
        assert!(m["active_months"].is_number());
        assert!(m["monthly_frequency"].is_number());
    }

    // WHOLE FOODS should appear as normalized name (not "WHOLE FOODS MKT #1234")
    let names: Vec<&str> = merchants.iter().map(|m| m["merchant"].as_str().unwrap()).collect();
    assert!(names.contains(&"WHOLE FOODS"), "Expected normalized merchant name 'WHOLE FOODS', got: {:?}", names);
}

#[tokio::test]
async fn test_patterns_returns_day_data() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/stats/patterns").await;
    assert_eq!(status, 200);

    assert!(json["data"]["day_of_week"].is_array());
    assert!(json["data"]["day_of_month"].is_array());

    let dow = json["data"]["day_of_week"].as_array().unwrap();
    for entry in dow {
        assert!(entry["day"].is_string());
        assert!(entry["day_num"].is_number());
        assert!(entry["total"].is_number());
        assert!(entry["count"].is_number());
    }
}
