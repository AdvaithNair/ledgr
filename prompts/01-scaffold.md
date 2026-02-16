# Prompt 1: Project Scaffolding, Docker, CLAUDE.md, Design System

## Goal
Bootable Next.js frontend + Docker Compose with PostgreSQL + empty Rust project skeleton + CLAUDE.md + design system configured.

## Context
We are building "Ledgr", a local-only personal finance dashboard. **Current year is 2026.**

**Pre-existing files:** Several backend and project files have already been created and can be used as-is or adjusted:
- `CLAUDE.md` — project conventions (already written, review and keep)
- `.gitignore` — standard ignores (already written)
- `docker-compose.yml` — PostgreSQL + Rust backend services (already written)
- `backend/Cargo.toml` — all dependencies listed (already written)
- `backend/Dockerfile` — multi-stage build (already written)
- `backend/.env` — local DATABASE_URL (already written)
- `backend/src/main.rs` — Axum server with health check, CORS, module declarations (already written, but references `db::create_pool()` and `routes::api_routes()` which belong to Prompt 2+; for this prompt, simplify to only use the health route and make module stubs compile)
- `backend/src/config.rs` — reads DATABASE_URL from env (already written)
- `backend/src/db.rs` — full connection pool + migrations (already written — this is Prompt 2 work; for now keep it but it won't be called from main yet)
- `backend/src/models/` — Transaction, ImportRecord structs with full fields (already written — Prompt 2 work)
- `backend/src/routes/` — full transaction + import route implementations (already written — Prompt 3 work)
- `backend/src/services/` — CSV parser + dedup implementations (already written — Prompt 3 work)

**What still needs to be done in this prompt:**
- Initialize the Next.js frontend (nothing exists in `frontend/` yet)
- Configure Tailwind with the custom dark palette and fonts
- Create the root layout with fonts and dark theme
- Create placeholder page
- Set up empty frontend directories (`components/`, `hooks/`, `lib/`, `types/`)
- `git init` and initial commit

The backend files are ahead of this prompt's scope — that's fine. The main task here is getting the frontend bootstrapped and the design system configured.

**Architecture:**
- **Frontend:** Next.js (App Router, React, TypeScript, Tailwind CSS) — runs on host via `npm run dev`
- **Backend:** Rust with Axum — runs in Docker
- **Database:** PostgreSQL — runs in Docker
- **Orchestration:** Docker Compose manages backend + database

## Target Structure After This Prompt

```
ledgr/
├── CLAUDE.md
├── .gitignore
├── docker-compose.yml
├── backend/
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── .env
│   └── src/
│       ├── main.rs              # Minimal Axum health-check endpoint
│       ├── config.rs            # Empty/stub
│       ├── db.rs                # Empty/stub
│       ├── models/
│       │   ├── mod.rs
│       │   ├── transaction.rs   # Empty/stub
│       │   └── import.rs        # Empty/stub
│       ├── routes/
│       │   ├── mod.rs
│       │   ├── transactions.rs  # Empty/stub
│       │   └── import.rs        # Empty/stub
│       └── services/
│           ├── mod.rs
│           ├── csv_parser.rs    # Empty/stub
│           └── dedup.rs         # Empty/stub
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   └── page.tsx
│       ├── components/          # Empty dir
│       ├── hooks/               # Empty dir
│       ├── lib/                 # Empty dir
│       └── types/               # Empty dir
└── prompts/                     # Already exists (these files)
```

## Detailed Tasks

### 1. Create `CLAUDE.md` at project root

Contents:

```markdown
# Ledgr — Local Personal Finance Dashboard

## Stack
- **Backend:** Rust (Axum) + PostgreSQL — both run in Docker
- **Frontend:** Next.js (App Router, React, TypeScript, Tailwind CSS) — runs on host

## Running
- `docker-compose up` for backend + database
- `cd frontend && npm run dev` for frontend (port 3000)

## Backend Conventions
- Routes in `backend/src/routes/`, models in `models/`, business logic in `services/`
- SQLx for database access
- All responses as JSON: `{ data?, error?, meta? }`
- API base: `http://localhost:8080/api/`

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
```

### 2. Create `.gitignore`

Include: `node_modules/`, `frontend/.next/`, `backend/target/`, `.env`, `backend/.env`, `.DS_Store`, `pgdata/`, IDE files.

### 3. Create `docker-compose.yml`

Two services:
- **db:** `postgres:16-alpine`, user `ledgr`, password `ledgr`, db `ledgr`, port 5432, volume `pgdata`, healthcheck with `pg_isready`
- **backend:** builds from `./backend`, port 8080, env `DATABASE_URL=postgres://ledgr:ledgr@db:5432/ledgr` and `RUST_LOG=info`, depends on db (condition: service_healthy)

Volume: `pgdata`

### 4. Initialize Rust project in `backend/`

**`Cargo.toml`** with these dependencies:
- `axum` 0.7 (features: multipart)
- `tokio` 1 (features: full)
- `sqlx` 0.7 (features: runtime-tokio-rustls, postgres, uuid, chrono, json)
- `serde` 1 (features: derive)
- `serde_json` 1
- `csv` 1
- `uuid` 1 (features: v4, serde)
- `chrono` 0.4 (features: serde)
- `tower-http` 0.5 (features: cors)
- `tracing` 0.1
- `tracing-subscriber` 0.3 (features: env-filter)
- `sha2` 0.10
- `hex` 0.4

**`backend/.env`:**
```
DATABASE_URL=postgres://ledgr:ledgr@localhost:5432/ledgr
```

**`backend/Dockerfile`** — multi-stage build:
- Stage 1 (`builder`): `rust:1.78-slim`, install `pkg-config` + `libssl-dev`, copy Cargo.toml, create dummy main.rs, `cargo build --release` for dependency caching, then copy real `src/` and build again.
- Stage 2 (`runtime`): `debian:bookworm-slim`, install `ca-certificates` + `libssl3`, copy binary from builder, expose 8080, CMD.

**`backend/src/main.rs`** — minimal Axum server:
- Initialize tracing
- Create a router with a single `GET /health` endpoint returning `"ok"`
- Set up CORS allowing `http://localhost:3000` origin, any methods, any headers
- Bind to `0.0.0.0:8080`
- Log startup message
- Stub: declare `mod config; mod db; mod models; mod routes; mod services;` but the router only uses the health route for now (don't call into the other modules yet — just make sure the stubs exist so it compiles)

All stub modules (`config.rs`, `db.rs`, `models/*.rs`, `routes/*.rs`, `services/*.rs`) should be empty files or just contain the necessary `pub mod` declarations to make the module tree compile.

### 5. Initialize Next.js in `frontend/`

Use `create-next-app` with: TypeScript, Tailwind, ESLint, App Router, `src/` directory, `@/*` import alias, npm.

After init, install additional deps:
```bash
npm install recharts date-fns framer-motion papaparse
npm install -D @types/papaparse
```

### 6. Configure Tailwind with custom dark palette

**`tailwind.config.ts`** — extend the theme with:
```typescript
colors: {
  bg: '#0A0A0F',
  surface: '#141419',
  border: '#1E1E26',
  // Preset card colors — additional card colors are applied dynamically via style attributes
  amex: '#C5A44E',
  citi: '#0066B2',
  capitalone: '#D42427',
}
```

Also extend `fontFamily`:
```typescript
fontFamily: {
  sans: ['Inter', ...defaultTheme.fontFamily.sans],
  mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
}
```

### 7. Configure fonts + root layout

**`frontend/src/app/layout.tsx`:**
- Import Inter and JetBrains Mono from `next/font/google`
- Set metadata: title "Ledgr", description "Local personal finance dashboard"
- Apply dark background (`bg-bg`), text white, both font CSS variables
- `<html lang="en" className="dark">`

**`frontend/src/app/globals.css`:**
- Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)
- Set `body` background to the bg color, ensure dark mode defaults
- Custom scrollbar styling (thin, dark)

### 8. Create placeholder `page.tsx`

Root `page.tsx` should show a centered dark page with the text "Ledgr" in a large font and a subtitle. This is temporary — will be replaced by a redirect to dashboard later.

### 9. Create empty directories

Ensure these exist (can put `.gitkeep` files or just leave empty):
- `frontend/src/components/`
- `frontend/src/hooks/`
- `frontend/src/lib/`
- `frontend/src/types/`
- `frontend/public/`

### 10. Git init

```bash
git init
git add .
git commit -m "Initial scaffold: Next.js frontend, Rust backend skeleton, Docker Compose, CLAUDE.md"
```

## Verification

1. `docker-compose up --build` — PostgreSQL starts healthy, Rust backend builds and starts, `curl localhost:8080/health` returns `ok`
2. `cd frontend && npm run dev` — Next.js compiles, browser at `localhost:3000` shows dark-themed page with "Ledgr"
3. Tailwind custom colors work (test by adding a temporary `text-amex` class)
4. Both fonts load (JetBrains Mono + Inter)
