# Security

## Local-Only Architecture

Ledgr is designed to never expose financial data to external services.

- **No cloud sync.** All data stays in a local PostgreSQL instance running in Docker.
- **No external API calls.** The backend makes zero outbound network requests — no analytics, no telemetry, no update checks.
- **No authentication layer.** The app is single-user and runs on localhost. There are no accounts, sessions, or tokens because it's not network-accessible by default.
- **No third-party frontend services.** No CDN-loaded scripts, no tracking pixels, no font services (fonts are bundled locally).

## Network Boundaries

- The backend binds to `0.0.0.0:8080` inside Docker but is only port-mapped to `localhost:8080` on the host.
- The frontend runs on `localhost:3000` via Next.js dev server.
- CORS is restricted to `http://localhost:3000` — the backend rejects requests from any other origin.

## Data Handling

### Transaction Deduplication
Each transaction is hashed using SHA-256 over `date|description|amount|card_code`. This hash is stored alongside the transaction and checked on every import to prevent duplicates. The hash is deterministic — the same transaction always produces the same hash regardless of when it's imported.

### Input Validation
- CSV files are parsed with the `csv` crate in flexible mode, handling varying column counts gracefully.
- Date parsing uses strict format matching (`MM/DD/YYYY`, `MM/DD/YY`, `YYYY-MM-DD`) — malformed dates cause the row to be skipped, not the import to fail.
- Amount parsing strips commas and validates as `f64` — non-numeric amounts cause the row to be skipped.
- Negative amounts and credit/payment rows are filtered out during parsing to only track charges.

### SQL Injection Prevention
All database queries use parameterized bindings via SQLx (`$1`, `$2`, etc.). No string interpolation is used for user-supplied values. Dynamic query construction (e.g., for sort columns) uses allowlist matching:

```rust
let sort_col = match params.sort_by.as_deref() {
    Some("date") => "date",
    Some("amount") => "amount",
    Some("description") => "description",
    Some("category") => "category",
    Some("card") => "card",
    _ => "date",
};
```

Sort direction is similarly constrained to `"ASC"` or `"DESC"` — arbitrary SQL cannot be injected through query parameters.

### Multipart Upload Handling
CSV imports use Axum's multipart extractor. The file content is read as a UTF-8 string in memory — files are never written to disk. There is no file path traversal risk because the file system is not involved.

## Database

- PostgreSQL 16 (Alpine) runs in a Docker container with a named volume (`pgdata`) for persistence.
- Database credentials are set via environment variables in `docker-compose.yml` (`ledgr`/`ledgr`). These are local-only defaults — the database is not exposed beyond the Docker network.
- Connection pooling is capped at 10 connections via SQLx's `PgPoolOptions`.
- Migrations run automatically on startup using idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
- Database indexes exist on `date`, `card`, `category`, and `hash` columns for query performance.

## What Ledgr Does Not Do

- No encryption at rest (the database volume is plain PostgreSQL storage). If disk-level encryption is needed, use OS-level full-disk encryption (FileVault, LUKS, BitLocker).
- No rate limiting. Since the app runs locally with a single user, request throttling is unnecessary.
- No audit logging. There is an import history table, but no general-purpose access log.
- No backup system. The database volume persists across container restarts but is not automatically backed up. Use `pg_dump` for manual backups if needed.
