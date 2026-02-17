INSERT INTO cards (code, label, color, header_pattern, delimiter, date_column, date_format, description_column, amount_column, debit_column, credit_column, category_column, member_column, skip_negative_amounts) VALUES
    ('amex', 'Amex Gold', '#C5A44E', 'card member,extended details', E'\t', 'Date', 'MM/DD/YY', 'Description', 'Amount', NULL, NULL, 'Category', 'Card Member', true),
    ('citi', 'Citi Costco', '#0066B2', 'debit,credit,member name', ',', 'Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', NULL, 'Member Name', false),
    ('capitalone', 'Capital One', '#D42427', 'posted date,card no', ',', 'Transaction Date', 'MM/DD/YY', 'Description', NULL, 'Debit', 'Credit', 'Category', NULL, false)
ON CONFLICT (code) DO NOTHING;
