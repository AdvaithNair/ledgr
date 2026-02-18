mod common;

use common::*;

#[tokio::test]
async fn test_transactions_list_empty() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"].as_array().unwrap().len(), 0);
    assert_eq!(json["meta"]["total"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_transactions_list_with_data() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?per_page=10").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    assert!(!data.is_empty());
    assert!(data.len() <= 10);

    // Check each transaction has required fields
    for txn in data {
        assert!(txn["id"].is_string());
        assert!(txn["date"].is_string());
        assert!(txn["description"].is_string());
        assert!(txn["amount"].is_number());
        assert!(txn["category"].is_string());
        assert!(txn["card"].is_string());
    }

    // Check pagination meta
    assert!(json["meta"]["page"].as_i64().unwrap() >= 1);
    assert!(json["meta"]["per_page"].as_i64().unwrap() == 10);
    assert!(json["meta"]["total"].as_i64().unwrap() > 0);
}

#[tokio::test]
async fn test_transactions_filter_by_card() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?card=amex").await;
    assert_eq!(status, 200);

    for txn in json["data"].as_array().unwrap() {
        assert_eq!(txn["card"].as_str().unwrap(), "amex");
    }
}

#[tokio::test]
async fn test_transactions_filter_by_category() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?category=Dining").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    assert!(!data.is_empty());
    for txn in data {
        assert_eq!(txn["category"].as_str().unwrap(), "Dining");
    }
}

#[tokio::test]
async fn test_transactions_sort_by_amount() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/transactions?sort_by=amount&sort_order=desc").await;
    assert_eq!(status, 200);

    let data = json["data"].as_array().unwrap();
    let amounts: Vec<f64> = data.iter().map(|t| t["amount"].as_f64().unwrap()).collect();
    for w in amounts.windows(2) {
        assert!(w[0] >= w[1], "Expected descending order: {} >= {}", w[0], w[1]);
    }
}

#[tokio::test]
async fn test_transactions_pagination() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool.clone());

    let (_, page1) = get_json(&app, "/api/transactions?per_page=5&page=1").await;
    let app2 = common::app(pool);
    let (_, page2) = get_json(&app2, "/api/transactions?per_page=5&page=2").await;

    let ids1: Vec<&str> = page1["data"].as_array().unwrap().iter().map(|t| t["id"].as_str().unwrap()).collect();
    let ids2: Vec<&str> = page2["data"].as_array().unwrap().iter().map(|t| t["id"].as_str().unwrap()).collect();

    // Pages should not overlap
    for id in &ids1 {
        assert!(!ids2.contains(id), "Page 2 contained ID from page 1: {}", id);
    }
}

#[tokio::test]
async fn test_update_category() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;

    // Get a transaction ID
    let app = app(pool.clone());
    let (_, json) = get_json(&app, "/api/transactions?per_page=1").await;
    let id = json["data"][0]["id"].as_str().unwrap();

    let app2 = common::app(pool);
    let (status, _) = patch_json(
        &app2,
        &format!("/api/transactions/{}", id),
        serde_json::json!({ "category": "NewCategory" }),
    ).await;
    assert_eq!(status, 200);
}

#[tokio::test]
async fn test_delete_all_transactions() {
    let pool = test_pool().await;
    clean(&pool).await;
    seed_transactions(&pool).await;
    let app = app(pool.clone());

    let (status, _) = delete_json(&app, "/api/transactions").await;
    assert_eq!(status, 200);

    // Verify empty
    let app2 = common::app(pool);
    let (_, json) = get_json(&app2, "/api/transactions").await;
    assert_eq!(json["meta"]["total"].as_i64().unwrap(), 0);
}

#[tokio::test]
async fn test_cards_list() {
    let pool = test_pool().await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/cards").await;
    assert_eq!(status, 200);

    // Seeded by migration 002 — should have 3 preset cards
    let cards = json["data"].as_array().unwrap();
    assert!(cards.len() >= 3, "Expected at least 3 preset cards");

    let codes: Vec<&str> = cards.iter().map(|c| c["code"].as_str().unwrap()).collect();
    assert!(codes.contains(&"amex"));
    assert!(codes.contains(&"citi"));
    assert!(codes.contains(&"capitalone"));
}

#[tokio::test]
async fn test_config_get_and_put() {
    let pool = test_pool().await;
    let app = app(pool.clone());

    // PUT a config value
    let (status, _) = put_json(
        &app,
        "/api/config",
        serde_json::json!({ "test_key": "test_value" }),
    ).await;
    assert_eq!(status, 200);

    // GET it back
    let app2 = common::app(pool);
    let (status, json) = get_json(&app2, "/api/config").await;
    assert_eq!(status, 200);
    assert_eq!(json["data"]["test_key"].as_str().unwrap(), "test_value");
}

#[tokio::test]
async fn test_import_history_empty() {
    let pool = test_pool().await;
    clean(&pool).await;
    let app = app(pool);

    let (status, json) = get_json(&app, "/api/import-history").await;
    assert_eq!(status, 200);
    assert!(json["data"].as_array().unwrap().is_empty());
}
