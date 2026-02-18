use chrono::NaiveDate;
use csv::ReaderBuilder;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::models::card::Card;
use crate::models::transaction::NewTransaction;
use crate::services::merchant_normalizer;

pub struct ParseResult {
    pub transactions: Vec<NewTransaction>,
    pub skipped_user_count: usize,
}

/// Detect which card matches the CSV headers by checking each card's header_pattern.
pub fn detect_card<'a>(headers_str: &str, cards: &'a [Card]) -> Option<&'a Card> {
    let lower = headers_str.to_lowercase();
    for card in cards {
        if let Some(ref pattern) = card.header_pattern {
            let keywords: Vec<&str> = pattern.split(',').map(|k| k.trim()).collect();
            if keywords.iter().all(|kw| lower.contains(kw)) {
                return Some(card);
            }
        }
    }
    None
}

/// Parse CSV data using the card's column config. Fully config-driven.
pub fn parse_csv(data: &str, card: &Card, user_name: Option<&str>) -> Result<ParseResult, String> {
    let delimiter = if card.delimiter.is_empty() {
        auto_detect_delimiter(data)
    } else {
        card.delimiter.as_bytes().first().copied().unwrap_or(b',')
    };

    let mut rdr = ReaderBuilder::new()
        .flexible(true)
        .delimiter(delimiter)
        .from_reader(data.as_bytes());

    let headers: Vec<String> = rdr
        .headers()
        .map_err(|e| format!("Failed to read CSV headers: {}", e))?
        .iter()
        .map(|h| h.trim().to_string())
        .collect();

    // Find column indices from card config
    let date_idx = find_column(&headers, card.date_column.as_deref())
        .ok_or("Date column not found in CSV")?;
    let desc_idx = find_column(&headers, card.description_column.as_deref())
        .ok_or("Description column not found in CSV")?;

    let amount_idx = card.amount_column.as_deref().and_then(|c| find_column(&headers, Some(c)));
    let debit_idx = card.debit_column.as_deref().and_then(|c| find_column(&headers, Some(c)));
    let _credit_idx = card.credit_column.as_deref().and_then(|c| find_column(&headers, Some(c)));
    let category_idx = card.category_column.as_deref().and_then(|c| find_column(&headers, Some(c)));
    let member_idx = card.member_column.as_deref().and_then(|c| find_column(&headers, Some(c)));

    let date_format = card.date_format.as_deref().unwrap_or("MM/DD/YY");

    let mut transactions = Vec::new();
    let mut skipped_user_count = 0usize;

    for result in rdr.records() {
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("Skipping CSV row: {}", e);
                continue;
            }
        };
        let fields: Vec<String> = record.iter().map(|f| f.trim().to_string()).collect();

        // Build raw_data JSONB
        let raw_data: serde_json::Value = headers
            .iter()
            .zip(fields.iter())
            .map(|(h, v)| (h.clone(), json!(v)))
            .collect::<serde_json::Map<String, serde_json::Value>>()
            .into();

        // Parse date
        let date_str = fields.get(date_idx).map(|s| s.as_str()).unwrap_or("");
        let date = match parse_date(date_str, date_format) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("Skipping row, bad date: {}", e);
                continue;
            }
        };

        // Parse description
        let description = fields.get(desc_idx).cloned().unwrap_or_default();
        if description.is_empty() {
            continue;
        }

        // Parse amount
        let amount = if let Some(idx) = amount_idx {
            // Single amount column mode
            let val_str = fields.get(idx).map(|s| s.as_str()).unwrap_or("");
            let val: f64 = match val_str.replace(',', "").parse() {
                Ok(v) => v,
                Err(_) => {
                    tracing::warn!("Skipping row, bad amount: {}", val_str);
                    continue;
                }
            };
            if card.skip_negative_amounts && val < 0.0 {
                continue; // Skip credits/payments
            }
            val
        } else if let Some(d_idx) = debit_idx {
            // Debit/credit column mode
            let debit_str = fields.get(d_idx).map(|s| s.as_str()).unwrap_or("");
            if debit_str.is_empty() {
                continue; // Credit-only row, skip
            }
            match debit_str.replace(',', "").parse::<f64>() {
                Ok(v) if v > 0.0 => v,
                _ => continue,
            }
        } else {
            tracing::warn!("No amount or debit column configured");
            continue;
        };

        // Authorized-user filtering
        if let Some(m_idx) = member_idx {
            if let Some(configured_name) = user_name {
                let member_val = fields.get(m_idx).map(|s| s.as_str()).unwrap_or("");
                if !fuzzy_name_match(configured_name, member_val) {
                    skipped_user_count += 1;
                    continue;
                }
            }
        }

        // Category
        let category = if let Some(c_idx) = category_idx {
            let csv_cat = fields.get(c_idx).map(|s| s.as_str()).unwrap_or("");
            if csv_cat.is_empty() {
                categorize(&description)
            } else {
                map_csv_category(csv_cat)
            }
        } else {
            categorize(&description)
        };

        let hash = compute_hash(&date.to_string(), &description, amount, &card.code);
        let merchant_normalized = merchant_normalizer::normalize_merchant(&description);

        transactions.push(NewTransaction {
            date,
            description,
            amount,
            category,
            card: card.code.clone(),
            card_label: card.label.clone(),
            raw_data: Some(raw_data),
            hash,
            merchant_normalized,
        });
    }

    Ok(ParseResult {
        transactions,
        skipped_user_count,
    })
}

fn find_column(headers: &[String], col_name: Option<&str>) -> Option<usize> {
    let name = col_name?;
    let lower = name.to_lowercase();
    headers.iter().position(|h| h.to_lowercase() == lower)
}

fn auto_detect_delimiter(data: &str) -> u8 {
    if let Some(first_line) = data.lines().next() {
        let tab_count = first_line.matches('\t').count();
        let comma_count = first_line.matches(',').count();
        if tab_count > comma_count {
            return b'\t';
        }
    }
    b','
}

fn parse_date(s: &str, format_hint: &str) -> Result<NaiveDate, String> {
    let s = s.trim();
    // Try the hint format first, then fallback chain
    let formats = match format_hint {
        "YYYY-MM-DD" => vec!["%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"],
        "MM/DD/YYYY" => vec!["%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"],
        _ => vec!["%m/%d/%y", "%m/%d/%Y", "%Y-%m-%d"], // MM/DD/YY default
    };

    for fmt in &formats {
        if let Ok(d) = NaiveDate::parse_from_str(s, fmt) {
            return Ok(d);
        }
    }
    Err(format!("Invalid date '{}' (expected {})", s, format_hint))
}

fn compute_hash(date: &str, description: &str, amount: f64, card: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}|{}|{:.2}|{}", date, description, amount, card));
    hex::encode(hasher.finalize())
}

/// Fuzzy match the configured user name against a CSV member field.
fn fuzzy_name_match(configured: &str, csv_member: &str) -> bool {
    if configured.is_empty() || csv_member.is_empty() {
        return false;
    }
    let cfg = configured.to_lowercase();
    let mem = csv_member.to_lowercase();

    // Direct containment
    if mem.contains(&cfg) || cfg.contains(&mem) {
        return true;
    }

    // Handle "LASTNAME, FIRSTNAME" format
    let cfg_parts: Vec<&str> = cfg.split_whitespace().collect();
    let mem_normalized = mem.replace(',', " ");
    let mem_parts: Vec<&str> = mem_normalized.split_whitespace().collect();

    // Check if all parts of the configured name appear in the member field
    if cfg_parts.iter().all(|part| mem_parts.iter().any(|mp| mp.contains(part))) {
        return true;
    }

    // Check if all parts of the member name appear in the configured name
    if mem_parts.iter().all(|part| cfg_parts.iter().any(|cp| cp.contains(part))) {
        return true;
    }

    false
}

/// Map verbose CSV category strings (like Amex's) to simplified categories.
fn map_csv_category(csv_cat: &str) -> String {
    let cat = csv_cat.to_lowercase();
    if cat.contains("groceries") {
        return "Groceries".into();
    }
    if cat.contains("restaurant") || cat.contains("café") || cat.contains("cafe") {
        return "Dining".into();
    }
    if cat.contains("gas") || cat.contains("fuel") {
        return "Gas".into();
    }
    if cat.contains("transportation") || cat.contains("taxi") {
        return "Transportation".into();
    }
    if cat.contains("travel") || cat.contains("airline") || cat.contains("hotel")
        || cat.contains("lodging")
    {
        return "Travel".into();
    }
    if cat.contains("internet purchase") || cat.contains("merchandise") {
        return "Shopping".into();
    }
    if cat.contains("subscription") || cat.contains("streaming") {
        return "Subscriptions".into();
    }
    if cat.contains("pharmacy") || cat.contains("health") || cat.contains("medical") {
        return "Health".into();
    }
    // If it doesn't match known patterns, use the CSV value as-is
    csv_cat.to_string()
}

fn categorize(description: &str) -> String {
    let desc = description.to_lowercase();

    if desc.contains("restaurant")
        || desc.contains("cafe")
        || desc.contains("coffee")
        || desc.contains("starbucks")
        || desc.contains("mcdonald")
        || desc.contains("chipotle")
        || desc.contains("grubhub")
        || desc.contains("doordash")
        || desc.contains("uber eat")
        || desc.contains("pizza")
        || desc.contains("sushi")
        || desc.contains("taco")
        || desc.contains("diner")
        || desc.contains("grill")
        || desc.contains("kitchen")
        || desc.contains("bakery")
        || desc.contains("panda express")
        || desc.contains("chick-fil")
    {
        return "Dining".into();
    }

    if desc.contains("grocery")
        || desc.contains("costco")
        || desc.contains("whole foods")
        || desc.contains("trader joe")
        || desc.contains("safeway")
        || desc.contains("kroger")
        || desc.contains("walmart")
        || desc.contains("target")
        || desc.contains("aldi")
        || desc.contains("hmart")
        || desc.contains("sprouts")
    {
        return "Groceries".into();
    }

    if desc.contains("gas")
        || desc.contains("shell")
        || desc.contains("chevron")
        || desc.contains("exxon")
        || desc.contains("bp ")
        || desc.contains("fuel")
        || desc.contains("texaco")
        || desc.contains("76 ")
    {
        return "Gas".into();
    }

    if desc.contains("amazon") || desc.contains("amzn") {
        return "Shopping".into();
    }

    if desc.contains("netflix")
        || desc.contains("spotify")
        || desc.contains("hulu")
        || desc.contains("disney")
        || desc.contains("apple.com")
        || desc.contains("youtube")
        || desc.contains("hbo")
        || desc.contains("paramount")
    {
        return "Subscriptions".into();
    }

    if desc.contains("uber")
        || desc.contains("lyft")
        || desc.contains("transit")
        || desc.contains("parking")
        || desc.contains("toll")
        || desc.contains("metro")
    {
        return "Transportation".into();
    }

    if desc.contains("airline")
        || desc.contains("hotel")
        || desc.contains("airbnb")
        || desc.contains("booking")
        || desc.contains("flight")
        || desc.contains("delta")
        || desc.contains("united")
        || desc.contains("marriott")
        || desc.contains("hilton")
    {
        return "Travel".into();
    }

    if desc.contains("pharmacy")
        || desc.contains("cvs")
        || desc.contains("walgreens")
        || desc.contains("doctor")
        || desc.contains("medical")
        || desc.contains("health")
    {
        return "Health".into();
    }

    "Uncategorized".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_detect_delimiter_csv() {
        assert_eq!(auto_detect_delimiter("a,b,c\n1,2,3"), b',');
    }

    #[test]
    fn test_auto_detect_delimiter_tsv() {
        assert_eq!(auto_detect_delimiter("a\tb\tc\n1\t2\t3"), b'\t');
    }

    #[test]
    fn test_parse_date_us_format() {
        let d = parse_date("01/15/26", "MM/DD/YY").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_iso_format() {
        let d = parse_date("2026-01-15", "YYYY-MM-DD").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_us_four_digit_year() {
        let d = parse_date("01/15/2026", "MM/DD/YYYY").unwrap();
        assert_eq!(d.to_string(), "2026-01-15");
    }

    #[test]
    fn test_parse_date_invalid() {
        assert!(parse_date("not-a-date", "MM/DD/YY").is_err());
    }

    #[test]
    fn test_find_column_case_insensitive() {
        let headers = vec!["Date".to_string(), "Description".to_string(), "Amount".to_string()];
        assert_eq!(find_column(&headers, Some("date")), Some(0));
        assert_eq!(find_column(&headers, Some("DESCRIPTION")), Some(1));
        assert_eq!(find_column(&headers, None), None);
        assert_eq!(find_column(&headers, Some("missing")), None);
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let h1 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        let h2 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_compute_hash_different_inputs() {
        let h1 = compute_hash("2026-01-15", "STARBUCKS", 5.75, "amex");
        let h2 = compute_hash("2026-01-16", "STARBUCKS", 5.75, "amex");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_fuzzy_name_match_exact() {
        assert!(fuzzy_name_match("John Doe", "John Doe"));
    }

    #[test]
    fn test_fuzzy_name_match_containment() {
        assert!(fuzzy_name_match("John", "John Doe"));
        assert!(fuzzy_name_match("John Doe", "John"));
    }

    #[test]
    fn test_fuzzy_name_match_lastname_first() {
        assert!(fuzzy_name_match("John Doe", "DOE, JOHN"));
    }

    #[test]
    fn test_fuzzy_name_match_no_match() {
        assert!(!fuzzy_name_match("John Doe", "Jane Smith"));
    }

    #[test]
    fn test_fuzzy_name_match_empty() {
        assert!(!fuzzy_name_match("", "John"));
        assert!(!fuzzy_name_match("John", ""));
    }

    #[test]
    fn test_categorize_dining() {
        assert_eq!(categorize("STARBUCKS COFFEE"), "Dining");
        assert_eq!(categorize("MCDONALD'S"), "Dining");
        assert_eq!(categorize("CHIPOTLE"), "Dining");
    }

    #[test]
    fn test_categorize_groceries() {
        assert_eq!(categorize("COSTCO WHOLESALE"), "Groceries");
        assert_eq!(categorize("WHOLE FOODS MARKET"), "Groceries");
        assert_eq!(categorize("TRADER JOE'S"), "Groceries");
    }

    #[test]
    fn test_categorize_uncategorized() {
        assert_eq!(categorize("RANDOM MERCHANT XYZ"), "Uncategorized");
    }

    #[test]
    fn test_map_csv_category_known() {
        assert_eq!(map_csv_category("Restaurant-Bar & Café"), "Dining");
        assert_eq!(map_csv_category("Merchandise & Supplies-Groceries"), "Groceries");
        assert_eq!(map_csv_category("Transportation-Fuel"), "Gas");
    }

    #[test]
    fn test_map_csv_category_passthrough() {
        assert_eq!(map_csv_category("Custom Category"), "Custom Category");
    }
}
