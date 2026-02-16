# Architecture

## Overview

Ledgr is a three-tier local application: a Next.js frontend talks to a Rust/Axum backend, which reads and writes to a PostgreSQL database. The backend and database run together in Docker Compose; the frontend runs on the host.

```
┌─────────────────┐       HTTP/JSON       ┌─────────────────┐       SQL        ┌──────────────┐
│   Next.js App   │ ───────────────────── │   Axum Backend  │ ──────────────── │  PostgreSQL  │
│   (host:3000)   │      localhost:8080    │  (Docker:8080)  │                  │  (Docker)    │
└─────────────────┘                        └─────────────────┘                  └──────────────┘
```

## Why This Stack

### Rust + Axum for the Backend

The backend does non-trivial computation — CSV parsing with multiple card formats, SHA-256 hashing for deduplication, merchant name normalization via regex pipelines, statistical analysis (z-scores, EWMA, HHI), and multi-query orchestration for the insights engine. Rust handles all of this efficiently without a runtime or garbage collector, and Axum provides a lightweight async HTTP framework that maps cleanly to the route/handler pattern.

SQLx gives compile-time-checked queries in development and parameterized bindings at runtime, eliminating an entire class of SQL injection bugs.

### PostgreSQL for Storage

Financial data is inherently relational — transactions belong to cards, spending aggregates by category and time period, budgets reference categories. PostgreSQL's window functions (`LAG`, `AVG OVER`, rolling aggregates), date functions (`date_trunc`, `EXTRACT`), and statistical functions (`STDDEV`) power the analytics endpoints without needing application-level computation for most aggregations. The `JSONB` column on transactions stores raw CSV row data for auditability without a separate table.

### Next.js for the Frontend

App Router provides file-based routing with React Server Components where appropriate. The dashboard, transactions, analytics, and import pages are all `"use client"` components because they manage local state and fetch data on mount, but the layout and routing shell benefit from server-side rendering. Tailwind CSS with a custom dark theme (design tokens for background, surface, and border colors) keeps styling consistent without a component library dependency.

### Docker Compose for Infrastructure

Running PostgreSQL in Docker avoids requiring a local database installation. The backend is also containerized so the entire data tier starts with a single `docker-compose up`. The frontend runs on the host to preserve the fast feedback loop of `next dev` with hot module replacement — containerizing it would add latency to every edit.

## Backend Structure

```
backend/src/
├── main.rs              # Server bootstrap, CORS, route mounting
├── config.rs            # Environment variable access
├── db.rs                # Connection pool + inline migrations
├── models/
│   ├── transaction.rs   # Transaction, NewTransaction, query/update structs
│   ├── import.rs        # ImportRecord
│   ├── analytics.rs     # Response structs for all analytics endpoints
│   └── budget.rs        # Budget, BudgetProgress
├── routes/
│   ├── mod.rs           # Route tree assembly
│   ├── transactions.rs  # CRUD: list, update category, bulk update, delete all
│   ├── import.rs        # CSV import, import history, all stats endpoints, insights
│   └── budget.rs        # Budget CRUD + progress
└── services/
    ├── csv_parser.rs    # Multi-format CSV parsing, card detection, auto-categorization
    ├── dedup.rs         # Hash-based duplicate detection
    └── merchant_normalizer.rs  # Regex + alias-based merchant name normalization
```

### Request Flow

1. Frontend sends a request to `localhost:8080/api/...`
2. Axum matches the route and extracts path params, query params, or multipart body
3. The handler receives a `State<PgPool>` and executes one or more SQLx queries
4. Results are serialized to JSON in the standard `{ data?, error?, meta? }` envelope
5. CORS headers are applied by the `tower-http` layer

### Data Flow for CSV Import

```
CSV file → multipart upload → detect delimiter → parse headers
  → detect card type (from header keywords)
  → parse each row with card-specific logic (date format, amount column, debit/credit split)
  → auto-categorize by description keywords or CSV category column
  → compute SHA-256 hash per transaction
  → check hash against existing transactions in DB
  → insert new transactions, skip duplicates
  → normalize merchant name for analytics
  → record import in import_history
  → return counts: new, duplicate, filtered
```

## Frontend Structure

```
frontend/src/
├── app/
│   ├── layout.tsx           # Root layout with sidebar
│   ├── page.tsx             # Redirects to /dashboard
│   ├── dashboard/page.tsx   # Overview with stats, charts, insights
│   ├── import/page.tsx      # CSV upload flow
│   ├── transactions/page.tsx # Filterable data table
│   ├── analytics/page.tsx   # Deep analysis views
│   └── settings/page.tsx    # Card, user, and budget configuration
├── components/
│   ├── sidebar.tsx          # Collapsible navigation
│   ├── page-header.tsx      # Title + description + optional action
│   ├── coverage-tracker.tsx # Monthly data coverage grid per card
│   ├── drop-zone.tsx        # Drag-and-drop file upload
│   └── ui/                  # Reusable primitives: card, button, badge, stat-card, skeleton, empty-state
├── lib/
│   ├── api.ts               # Typed fetch wrapper for all backend endpoints
│   ├── constants.ts         # Category colors, card helpers
│   └── utils.ts             # cn(), formatCurrency(), formatDate(), truncateText()
└── types/
    └── index.ts             # All TypeScript interfaces matching backend response shapes
```

### State Management

Each page manages its own state with React `useState` and `useEffect`. There is no global state store — data is fetched on mount and passed as props to child components. This keeps pages independent and avoids stale cache issues. The API client (`lib/api.ts`) is a thin typed wrapper around `fetch`, not a state management layer.

## Database Schema

```sql
transactions
├── id               UUID (PK, auto-generated)
├── date             DATE
├── description      TEXT
├── amount           NUMERIC(12,2)
├── category         TEXT (default: 'Uncategorized')
├── card             TEXT (card code, e.g. 'amex')
├── card_label       TEXT (denormalized, e.g. 'Amex Gold')
├── raw_data         JSONB (original CSV row)
├── hash             TEXT (SHA-256 for dedup)
├── merchant_normalized  TEXT (cleaned merchant name)
└── created_at       TIMESTAMPTZ

import_history
├── id               UUID (PK)
├── imported_at      TIMESTAMPTZ
├── card             TEXT
├── file_name        TEXT
├── transaction_count INTEGER
└── duplicate_count  INTEGER

budgets
├── id               UUID (PK)
├── category         TEXT (UNIQUE)
├── monthly_limit    NUMERIC(12,2)
├── created_at       TIMESTAMPTZ
└── updated_at       TIMESTAMPTZ
```

Indexes on `transactions`: `date`, `card`, `category`, `hash`.

## API Design

All endpoints live under `/api`. Responses follow a consistent JSON envelope:

- Success: `{ "data": ... }` with optional `{ "meta": { page, per_page, total, total_pages } }` for paginated responses
- Error: `{ "error": "message" }`

### Endpoint Map

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/api/transactions` | List with filters, sort, pagination |
| PATCH | `/api/transactions/{id}` | Update category |
| PATCH | `/api/transactions/bulk-category` | Bulk category update |
| DELETE | `/api/transactions` | Delete all transactions |
| POST | `/api/transactions/import` | CSV file upload |
| GET | `/api/import-history` | Import log |
| GET | `/api/stats/summary` | Totals, MoM, averages, by-card, by-category |
| GET | `/api/stats/monthly` | Monthly totals with growth % and rolling average |
| GET | `/api/stats/merchants` | Top merchants with frequency and normalization |
| GET | `/api/stats/patterns` | Day-of-week and day-of-month aggregates |
| GET | `/api/stats/recurring` | Subscription/recurring detection |
| GET | `/api/stats/anomalies` | Category and transaction anomaly detection |
| GET | `/api/stats/forecast` | Multi-method spending projections |
| GET | `/api/stats/habits` | Behavioral pattern analysis |
| GET | `/api/stats/daily` | Daily totals for heatmap |
| GET | `/api/stats/category/{cat}` | Single-category deep dive |
| GET | `/api/insights` | Ranked smart insights |
| GET | `/api/budgets` | List budgets |
| POST | `/api/budgets` | Create/update budget (upsert) |
| GET | `/api/budgets/progress` | Current month budget progress |
| DELETE | `/api/budgets/{id}` | Delete budget |

## Design Decisions

### Card-Agnostic Architecture
Cards are database records, not code constants. The three presets (Amex, Citi, Capital One) are seeded but users can add any card with custom CSV column mappings and header detection patterns. This means the app doesn't need code changes to support a new card issuer — just a new database row.

### Hash-Based Deduplication
Rather than tracking "which files have been imported," deduplication works at the transaction level via SHA-256 hashing of `date|description|amount|card`. This allows partial and overlapping imports — users can download a 3-month statement and re-import it alongside a 1-month statement without creating duplicates, because each individual transaction is fingerprinted.

### Inline Migrations
The backend runs `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on every startup. This avoids a separate migration tool and migration files while remaining idempotent. For a single-user local app, this is simpler than managing migration state.

### All Analytics Server-Side
Aggregation queries run in PostgreSQL, not in the browser. The frontend receives pre-computed stats and renders them. This keeps the frontend thin and avoids shipping raw transaction data to the client for large datasets. The analytics endpoints (forecast, habits, insights) perform non-trivial computation but return simple JSON responses.

### No Global State
Each page fetches its own data independently. This trades some redundant API calls (e.g., both dashboard and analytics fetch monthly data) for simplicity — no cache invalidation bugs, no stale state after imports, no complex state synchronization between pages.
