use chrono::NaiveDate;
use csv::ReaderBuilder;
use serde_json::json;
use sha2::{Sha256, Digest};

use crate::models::transaction::NewTransaction;

#[derive(Debug, Clone, PartialEq)]
pub enum CardType {
    AmexGold,
    CitiCostco,
    CapitalOne,
}

impl CardType {
    pub fn code(&self) -> &str {
        match self {
            CardType::AmexGold => "amex",
            CardType::CitiCostco => "citi",
            CardType::CapitalOne => "capitalone",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            CardType::AmexGold => "Amex Gold",
            CardType::CitiCostco => "Citi Costco",
            CardType::CapitalOne => "Capital One",
        }
    }
}

pub fn detect_card_type(headers: &[String]) -> Option<CardType> {
    let header_str = headers.join(",").to_lowercase();

    if header_str.contains("card member") || (header_str.contains("date") && header_str.contains("amount") && header_str.contains("extended details")) {
        return Some(CardType::AmexGold);
    }
    if header_str.contains("debit") && header_str.contains("credit") && header_str.contains("member") {
        return Some(CardType::CitiCostco);
    }
    if header_str.contains("posted date") || (header_str.contains("debit") && header_str.contains("credit") && header_str.contains("card no.")) {
        return Some(CardType::CapitalOne);
    }

    None
}

fn detect_delimiter(data: &str) -> u8 {
    if let Some(first_line) = data.lines().next() {
        let tab_count = first_line.matches('\t').count();
        let comma_count = first_line.matches(',').count();
        if tab_count > comma_count {
            return b'\t';
        }
    }
    b','
}

pub fn parse_csv(data: &str) -> Result<(CardType, Vec<NewTransaction>), String> {
    let delimiter = detect_delimiter(data);
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

    let card_type = detect_card_type(&headers)
        .ok_or_else(|| "Could not detect card type from CSV headers".to_string())?;

    let mut transactions = Vec::new();

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        let fields: Vec<String> = record.iter().map(|f| f.trim().to_string()).collect();

        match parse_row(&card_type, &headers, &fields) {
            Ok(Some(txn)) => transactions.push(txn),
            Ok(None) => continue, // Skip (e.g., credit/payment rows)
            Err(e) => {
                tracing::warn!("Skipping row: {}", e);
                continue;
            }
        }
    }

    Ok((card_type, transactions))
}

fn parse_row(
    card_type: &CardType,
    headers: &[String],
    fields: &[String],
) -> Result<Option<NewTransaction>, String> {
    let raw_data: serde_json::Value = headers
        .iter()
        .zip(fields.iter())
        .map(|(h, v)| (h.clone(), json!(v)))
        .collect::<serde_json::Map<String, serde_json::Value>>()
        .into();

    match card_type {
        CardType::AmexGold => parse_amex(fields, raw_data),
        CardType::CitiCostco => parse_citi(fields, headers, raw_data),
        CardType::CapitalOne => parse_capone(fields, headers, raw_data),
    }
}

fn parse_amex(fields: &[String], raw_data: serde_json::Value) -> Result<Option<NewTransaction>, String> {
    // Amex format (tab-separated, 13 columns):
    // Date, Description, Card Member, Account #, Amount, Extended Details,
    // Appears On Your Statement As, Address, City/State, Zip Code, Country, Reference, Category
    if fields.len() < 5 {
        return Err("Not enough fields for Amex row".into());
    }

    let date = parse_date_mdy(&fields[0])?;
    let description = fields[1].clone();
    let amount_str = &fields[4];
    let amount: f64 = amount_str.replace(",", "").parse()
        .map_err(|_| format!("Invalid amount: {}", amount_str))?;

    // Amex: positive = charge, negative = credit/refund
    // We want charges as positive
    if amount < 0.0 {
        return Ok(None); // Skip credits/payments
    }

    // Amex CSV has a Category column at index 12 (e.g., "Merchandise & Supplies-Groceries")
    // Fall back to auto-categorization from description
    let category = if fields.len() > 12 && !fields[12].is_empty() {
        map_amex_category(&fields[12])
    } else {
        categorize(&description)
    };
    let hash = compute_hash(&date.to_string(), &description, amount, "amex");

    Ok(Some(NewTransaction {
        date,
        description,
        amount,
        category,
        card: "amex".into(),
        card_label: "Amex Gold".into(),
        raw_data: Some(raw_data),
        hash,
    }))
}

fn parse_citi(fields: &[String], headers: &[String], raw_data: serde_json::Value) -> Result<Option<NewTransaction>, String> {
    // Citi format: Status, Date, Description, Debit, Credit, Member
    let date_idx = headers.iter().position(|h| h.to_lowercase() == "date").unwrap_or(1);
    let desc_idx = headers.iter().position(|h| h.to_lowercase() == "description").unwrap_or(2);
    let debit_idx = headers.iter().position(|h| h.to_lowercase() == "debit").unwrap_or(3);
    let credit_idx = headers.iter().position(|h| h.to_lowercase() == "credit").unwrap_or(4);

    if fields.len() <= debit_idx.max(credit_idx) {
        return Err("Not enough fields for Citi row".into());
    }

    let date = parse_date_mdy(fields.get(date_idx).unwrap_or(&String::new()))?;
    let description = fields.get(desc_idx).unwrap_or(&String::new()).clone();

    let debit_str = fields.get(debit_idx).unwrap_or(&String::new()).clone();
    let credit_str = fields.get(credit_idx).unwrap_or(&String::new()).clone();

    let amount = if !debit_str.is_empty() {
        debit_str.replace(",", "").parse::<f64>().unwrap_or(0.0)
    } else if !credit_str.is_empty() {
        return Ok(None); // Skip credits/payments
    } else {
        return Ok(None);
    };

    if amount <= 0.0 {
        return Ok(None);
    }

    let category = categorize(&description);
    let hash = compute_hash(&date.to_string(), &description, amount, "citi");

    Ok(Some(NewTransaction {
        date,
        description,
        amount,
        category,
        card: "citi".into(),
        card_label: "Citi Costco".into(),
        raw_data: Some(raw_data),
        hash,
    }))
}

fn parse_capone(fields: &[String], headers: &[String], raw_data: serde_json::Value) -> Result<Option<NewTransaction>, String> {
    // Capital One format: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit
    // Date format: M/DD/YY (e.g., "2/12/26")
    let date_idx = headers.iter().position(|h| h.to_lowercase().contains("transaction date")).unwrap_or(0);
    let desc_idx = headers.iter().position(|h| h.to_lowercase() == "description").unwrap_or(3);
    let cat_idx = headers.iter().position(|h| h.to_lowercase() == "category").unwrap_or(4);
    let debit_idx = headers.iter().position(|h| h.to_lowercase() == "debit").unwrap_or(5);
    let credit_idx = headers.iter().position(|h| h.to_lowercase() == "credit").unwrap_or(6);

    if fields.len() <= debit_idx.max(credit_idx) {
        return Err("Not enough fields for Capital One row".into());
    }

    let date = parse_date_ymd_or_mdy(fields.get(date_idx).unwrap_or(&String::new()))?;
    let description = fields.get(desc_idx).unwrap_or(&String::new()).clone();

    let debit_str = fields.get(debit_idx).unwrap_or(&String::new()).clone();
    let credit_str = fields.get(credit_idx).unwrap_or(&String::new()).clone();

    let amount = if !debit_str.is_empty() {
        debit_str.replace(",", "").parse::<f64>().unwrap_or(0.0)
    } else if !credit_str.is_empty() {
        return Ok(None); // Skip credits
    } else {
        return Ok(None);
    };

    if amount <= 0.0 {
        return Ok(None);
    }

    let category_from_csv = fields.get(cat_idx).unwrap_or(&String::new()).clone();
    let category = if category_from_csv.is_empty() {
        categorize(&description)
    } else {
        category_from_csv
    };

    let hash = compute_hash(&date.to_string(), &description, amount, "capitalone");

    Ok(Some(NewTransaction {
        date,
        description,
        amount,
        category,
        card: "capitalone".into(),
        card_label: "Capital One".into(),
        raw_data: Some(raw_data),
        hash,
    }))
}

fn parse_date_mdy(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s.trim(), "%m/%d/%Y")
        .or_else(|_| NaiveDate::parse_from_str(s.trim(), "%m/%d/%y"))
        .map_err(|e| format!("Invalid date '{}': {}", s, e))
}

fn parse_date_ymd_or_mdy(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d")
        .or_else(|_| NaiveDate::parse_from_str(s.trim(), "%m/%d/%Y"))
        .or_else(|_| NaiveDate::parse_from_str(s.trim(), "%m/%d/%y"))
        .map_err(|e| format!("Invalid date '{}': {}", s, e))
}

fn compute_hash(date: &str, description: &str, amount: f64, card: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}|{}|{:.2}|{}", date, description, amount, card));
    hex::encode(hasher.finalize())
}

/// Map Amex's verbose category strings to our simplified categories.
/// Examples: "Merchandise & Supplies-Groceries" → "Groceries",
///           "Transportation-Taxis & Coach" → "Transportation",
///           "Restaurant-Bar & Café" → "Dining"
fn map_amex_category(amex_cat: &str) -> String {
    let cat = amex_cat.to_lowercase();
    if cat.contains("groceries") { return "Groceries".into(); }
    if cat.contains("restaurant") || cat.contains("café") || cat.contains("cafe") { return "Dining".into(); }
    if cat.contains("gas") || cat.contains("fuel") { return "Gas".into(); }
    if cat.contains("transportation") || cat.contains("taxi") { return "Transportation".into(); }
    if cat.contains("travel") || cat.contains("airline") || cat.contains("hotel") || cat.contains("lodging") { return "Travel".into(); }
    if cat.contains("internet purchase") || cat.contains("merchandise") { return "Shopping".into(); }
    if cat.contains("subscription") || cat.contains("streaming") { return "Subscriptions".into(); }
    if cat.contains("pharmacy") || cat.contains("health") || cat.contains("medical") { return "Health".into(); }
    "Uncategorized".into()
}

fn categorize(description: &str) -> String {
    let desc = description.to_lowercase();

    if desc.contains("restaurant") || desc.contains("cafe") || desc.contains("coffee")
        || desc.contains("starbucks") || desc.contains("mcdonald") || desc.contains("chipotle")
        || desc.contains("grubhub") || desc.contains("doordash") || desc.contains("uber eat")
        || desc.contains("pizza") || desc.contains("sushi") || desc.contains("taco")
        || desc.contains("diner") || desc.contains("grill") || desc.contains("kitchen")
        || desc.contains("bakery") || desc.contains("panda express") || desc.contains("chick-fil")
    {
        return "Dining".into();
    }

    if desc.contains("grocery") || desc.contains("costco") || desc.contains("whole foods")
        || desc.contains("trader joe") || desc.contains("safeway") || desc.contains("kroger")
        || desc.contains("walmart") || desc.contains("target") || desc.contains("aldi")
        || desc.contains("hmart") || desc.contains("sprouts")
    {
        return "Groceries".into();
    }

    if desc.contains("gas") || desc.contains("shell") || desc.contains("chevron")
        || desc.contains("exxon") || desc.contains("bp ") || desc.contains("fuel")
        || desc.contains("texaco") || desc.contains("76 ")
    {
        return "Gas".into();
    }

    if desc.contains("amazon") || desc.contains("amzn") {
        return "Shopping".into();
    }

    if desc.contains("netflix") || desc.contains("spotify") || desc.contains("hulu")
        || desc.contains("disney") || desc.contains("apple.com") || desc.contains("youtube")
        || desc.contains("hbo") || desc.contains("paramount")
    {
        return "Subscriptions".into();
    }

    if desc.contains("uber") || desc.contains("lyft") || desc.contains("transit")
        || desc.contains("parking") || desc.contains("toll") || desc.contains("metro")
    {
        return "Transportation".into();
    }

    if desc.contains("airline") || desc.contains("hotel") || desc.contains("airbnb")
        || desc.contains("booking") || desc.contains("flight") || desc.contains("delta")
        || desc.contains("united") || desc.contains("marriott") || desc.contains("hilton")
    {
        return "Travel".into();
    }

    if desc.contains("pharmacy") || desc.contains("cvs") || desc.contains("walgreens")
        || desc.contains("doctor") || desc.contains("medical") || desc.contains("health")
    {
        return "Health".into();
    }

    "Uncategorized".into()
}
