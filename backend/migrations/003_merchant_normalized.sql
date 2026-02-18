-- Add normalized merchant name column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_normalized TEXT;

-- Backfill existing rows with SQL-level normalization
UPDATE transactions
SET merchant_normalized = UPPER(TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(description, '\s*#\d+|\s*STORE\s*\d+|\s*\*[A-Z0-9]+', '', 'g'),
      ',\s*[A-Z]{2}\s*\d{5}.*$', '', 'g'
    ),
    '\s+', ' ', 'g'
  )
))
WHERE merchant_normalized IS NULL;
