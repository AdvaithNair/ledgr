#!/usr/bin/env bash
set -e

# Create the test database if it doesn't exist
# Connects to the default 'ledgr' database to run CREATE DATABASE
docker compose exec -T db psql -U ledgr -d ledgr -c \
  "SELECT 'CREATE DATABASE ledgr_test OWNER ledgr' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ledgr_test')" \
  | docker compose exec -T db psql -U ledgr -d ledgr 2>/dev/null || true

# Simpler fallback — just try to create it, ignore if exists
docker compose exec -T db psql -U ledgr -d ledgr -c "CREATE DATABASE ledgr_test OWNER ledgr;" 2>/dev/null || true

echo "✓ Test database 'ledgr_test' ready"
