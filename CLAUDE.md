# Ledgr — Local Personal Finance Dashboard

## Stack
- **Backend:** Rust (Axum) + PostgreSQL — both run in Docker
- **Frontend:** Next.js (App Router, React, TypeScript, Tailwind CSS) — runs on host

## Running
- `docker-compose up` for backend + database
- `cd frontend && bun dev` for frontend (port 3000)

## Backend Conventions
- Routes in `backend/src/routes/`, models in `models/`, business logic in `services/`
- SQLx for database access
- All responses as JSON: `{ data?, error?, meta? }`
- API base: `http://localhost:8080/api/`

## Migrations
- Uses SQLx file-based migrations in `backend/migrations/`
- Migrations run automatically on startup via `sqlx::migrate!()`
- Naming: `NNN_description.sql` (e.g., `001_initial_schema.sql`)
- To add a schema change: create the next numbered `.sql` file in `backend/migrations/`
- Migrations are tracked in `_sqlx_migrations` table — each runs exactly once
- Use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` where appropriate for safety
- Never modify an already-applied migration — always create a new one

## Frontend Conventions
- `src/app/` for routes, `src/components/` for UI, `src/lib/` for utilities, `src/types/` for types
- `"use client"` only when needed
- Tailwind design tokens only — never hardcode hex values

## Naming
- Rust: snake_case
- Frontend: kebab-case files, PascalCase components, camelCase functions

## Design System
- **Card colors (presets):** Amex `#C5A44E`, Citi `#0066B2`, CapOne `#D42427` — users can add custom cards with any color
- **Background:** `#0A0A0F`, surface: `#141419`, border: `#1E1E26`
- **Fonts:** `font-mono` (JetBrains Mono) for financial data, `font-sans` (Inter) for UI

## Cards
- Card-agnostic — 3 presets (Amex, Citi, Capital One) but users can add/remove cards freely
- Each card has: code, label, color, and CSV column mapping
- Cards stored in the database, not hardcoded

## User Identity
- User configures their name (first or first + last) on first use
- Used to filter out authorized-user transactions that aren't theirs (fuzzy match)
- Stored persistently in the database

## CSV Import
- Supports partial/overlapping imports — deduplicates by transaction hash
- Auto-detects card type from CSV headers when possible, manual dropdown fallback
- Each card defines its own CSV column mapping for flexible format support

## CORS
- Backend allows `localhost:3000`

## Recharts
- Custom dark theme colors, no defaults

## Privacy
- No external services — fully local, no analytics, no telemetry
