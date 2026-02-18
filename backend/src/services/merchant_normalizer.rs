use regex::Regex;
use std::sync::LazyLock;

static RE_PAYMENT_PREFIX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(SQ \*|TST\*|TST \*|PP\*|PAYPAL \*|VENMO \*|ZELLE \*)").unwrap());

static RE_STORE_NUM: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"#\d+").unwrap());

static RE_STORE_WORD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\bSTORE\s*\d+").unwrap());

static RE_REF_CODE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\*[A-Z0-9]{6,}").unwrap());

static RE_TRAILING_LOCATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r",\s*[A-Z]{2}\s*\d{5}.*$").unwrap());

static RE_TRAILING_NUMBERS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s+\d+\s*$").unwrap());

static RE_MULTI_SPACE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s+").unwrap());

pub fn normalize_merchant(description: &str) -> String {
    let mut name = description.to_uppercase();
    name = name.trim().to_string();

    // Strip payment prefixes
    name = RE_PAYMENT_PREFIX.replace(&name, "").to_string();

    // Strip store/location identifiers
    name = RE_STORE_NUM.replace_all(&name, "").to_string();
    name = RE_STORE_WORD.replace_all(&name, "").to_string();
    name = RE_REF_CODE.replace_all(&name, "").to_string();

    // Strip trailing location info
    name = RE_TRAILING_LOCATION.replace(&name, "").to_string();

    // Strip trailing numbers-only segments
    name = RE_TRAILING_NUMBERS.replace(&name, "").to_string();

    // Normalize whitespace
    name = RE_MULTI_SPACE.replace_all(&name, " ").to_string();
    name = name.trim().to_string();

    // Apply known aliases
    name = apply_aliases(&name).to_string();

    name.trim().to_string()
}

fn apply_aliases(name: &str) -> &str {
    let aliases: &[(&str, &str)] = &[
        ("AMZN MKTPL", "AMAZON"),
        ("AMZN", "AMAZON"),
        ("AMAZON.COM", "AMAZON"),
        ("AMAZON MKTPLACE", "AMAZON"),
        ("WM SUPERCENTER", "WALMART"),
        ("WAL-MART", "WALMART"),
        ("WALMART.COM", "WALMART"),
        ("WHOLEFDS", "WHOLE FOODS"),
        ("WHOLE FOODS MKT", "WHOLE FOODS"),
        ("COSTCO WHSE", "COSTCO"),
        ("COSTCO WHOLESALE", "COSTCO"),
        ("MCDONALD'S", "MCDONALDS"),
        ("CHICK-FIL-A", "CHICK-FIL-A"),
        ("DD/BR", "DUNKIN DONUTS"),
        ("DUNKIN", "DUNKIN DONUTS"),
    ];
    for (pattern, canonical) in aliases {
        if name.starts_with(pattern) {
            return canonical;
        }
    }
    name
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_uppercase_and_trim() {
        assert_eq!(normalize_merchant("  starbucks  "), "STARBUCKS");
    }

    #[test]
    fn test_strips_store_numbers() {
        assert_eq!(normalize_merchant("TARGET STORE #12345"), "TARGET STORE");
        assert_eq!(normalize_merchant("WALMART STORE 9876"), "WALMART");
    }

    #[test]
    fn test_strips_payment_prefixes() {
        assert_eq!(normalize_merchant("SQ *COFFEE SHOP"), "COFFEE SHOP");
        assert_eq!(normalize_merchant("TST*RESTAURANT"), "RESTAURANT");
        assert_eq!(normalize_merchant("PP*EBAY PURCHASE"), "EBAY PURCHASE");
        assert_eq!(normalize_merchant("PAYPAL *VENDOR"), "VENDOR");
        assert_eq!(normalize_merchant("VENMO *JOHN"), "JOHN");
        assert_eq!(normalize_merchant("ZELLE *PAYMENT"), "PAYMENT");
    }

    #[test]
    fn test_strips_reference_codes() {
        assert_eq!(normalize_merchant("UBER *ABCDEF123"), "UBER");
    }

    #[test]
    fn test_strips_trailing_location() {
        assert_eq!(normalize_merchant("COSTCO WHOLESALE, CA 90210"), "COSTCO");
    }

    #[test]
    fn test_alias_amazon() {
        assert_eq!(normalize_merchant("AMZN Mktpl US"), "AMAZON");
        assert_eq!(normalize_merchant("AMAZON.COM PURCHASE"), "AMAZON");
        assert_eq!(normalize_merchant("AMZN MKTPL US*AB1234"), "AMAZON");
    }

    #[test]
    fn test_alias_walmart() {
        assert_eq!(normalize_merchant("WM SUPERCENTER #1234"), "WALMART");
        assert_eq!(normalize_merchant("WAL-MART STORE 5678"), "WALMART");
    }

    #[test]
    fn test_alias_whole_foods() {
        assert_eq!(normalize_merchant("WHOLEFDS MKT 1234"), "WHOLE FOODS");
        assert_eq!(normalize_merchant("WHOLE FOODS MKT #9876"), "WHOLE FOODS");
    }

    #[test]
    fn test_alias_costco() {
        assert_eq!(normalize_merchant("COSTCO WHSE #123"), "COSTCO");
        assert_eq!(normalize_merchant("COSTCO WHOLESALE, WA 98101"), "COSTCO");
    }

    #[test]
    fn test_alias_fast_food() {
        assert_eq!(normalize_merchant("MCDONALD'S #12345"), "MCDONALDS");
        assert_eq!(normalize_merchant("DUNKIN #456"), "DUNKIN DONUTS");
        assert_eq!(normalize_merchant("DD/BR #789"), "DUNKIN DONUTS");
    }

    #[test]
    fn test_no_alias_passthrough() {
        assert_eq!(normalize_merchant("NORDSTROM"), "NORDSTROM");
        assert_eq!(normalize_merchant("Target"), "TARGET");
    }

    #[test]
    fn test_collapses_whitespace() {
        assert_eq!(normalize_merchant("SOME    STORE   NAME"), "SOME STORE NAME");
    }

    #[test]
    fn test_empty_input() {
        assert_eq!(normalize_merchant(""), "");
    }
}
