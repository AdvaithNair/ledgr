# Ledgr — Claude Code Commands Guide

Five custom slash commands live in `.claude/commands/`. They embed all project conventions so Claude produces consistent code without re-reading docs every time.

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `/project:build-step` | Execute a numbered prompt | `/project:build-step 03` |
| `/project:frontend-design` | Build UI with the design system | `/project:frontend-design Add a settings page` |
| `/project:backend-api` | Build Rust/Axum endpoints | `/project:backend-api Add budget tracking` |
| `/project:verify` | Run verification checks | `/project:verify 06` |
| `/project:fix` | Debug and fix issues | `/project:fix TypeScript error in dashboard` |

---

## Building the App — Step by Step

Run each prompt in order. Each step builds on the previous one.

### Step 1 — Scaffold

```
/project:build-step 01
```

Creates the project skeleton: Next.js frontend, Docker Compose with PostgreSQL, empty Rust backend, Tailwind dark theme config. Everything boots but does nothing yet.

**Verify:** `docker-compose up` starts clean, `cd frontend && npm run dev` shows the default page.

### Step 2 — Database + Backend Foundation

```
/project:build-step 02
```

Creates PostgreSQL tables (`transactions`, `import_history`), SQLx connection pool, Rust models, and config module. Backend connects to the database on startup.

**Verify:** `docker-compose up --build` logs "Database migrations completed", tables exist in PostgreSQL.

### Step 3 — Backend API

```
/project:build-step 03
```

Implements all REST endpoints: transaction CRUD, CSV import (3 card formats), stats (summary, monthly, merchants, patterns), and import history. This completes the entire backend.

**Verify:** `curl localhost:8080/api/transactions` returns valid JSON. Import a test CSV and confirm data flows through all stat endpoints.

### Step 4 — Frontend Foundation

```
/project:build-step 04
```

Creates TypeScript types, API client, utility functions, collapsible sidebar, all shared UI components (Card, Button, Badge, StatCard, Skeleton, EmptyState), and page stubs for all 4 routes.

**Verify:** `npm run dev` compiles, sidebar navigates between pages, `npx tsc --noEmit` passes.

### Step 5 — Import Page

```
/project:build-step 05
```

Builds the CSV import page: drag-and-drop upload zone, card format detection, import progress, results display, and import history table.

**Verify:** Upload a test CSV, see import results, check import history populates.

### Step 6 — Dashboard

```
/project:build-step 06
```

Builds the dashboard: hero stat, period selector, spending trend chart, category breakdown, card comparison, and top merchants. First page users see after importing data.

**Verify:** Import some data first (step 5), then check that all charts render with real numbers.

### Step 7 — Transactions Table

```
/project:build-step 07
```

Builds the transactions page: filterable/sortable data table with search, card/category filters, pagination, inline category editing, and bulk category updates.

**Verify:** Transactions list loads, filters work, category editing persists.

### Step 8 — Analytics

```
/project:build-step 08
```

Builds the analytics page: monthly trends, category deep-dive, card comparison, day-of-week/day-of-month spending patterns, and top merchants analysis.

**Verify:** All chart sections render, switching between views works.

---

## After Building — Ongoing Development

### Adding a new frontend feature

Use `frontend-design` to get the full design system injected into context:

```
/project:frontend-design Add a recurring transactions detector that highlights subscriptions
```

```
/project:frontend-design Add a month-over-month comparison card to the dashboard
```

```
/project:frontend-design Build a settings page with data export and theme toggle
```

Claude will use the correct color tokens, font rules, component library, Recharts config, and animation patterns without you specifying any of it.

### Adding a new backend endpoint

Use `backend-api` to get all Axum/SQLx patterns injected:

```
/project:backend-api Add a GET /api/stats/recurring endpoint that detects recurring merchants
```

```
/project:backend-api Add a budget system with POST/GET /api/budgets endpoints
```

Claude will follow the route registration pattern, JSON response format, SQLx query style, and error handling conventions.

### Fixing issues

Use `fix` with a description of the problem:

```
/project:fix TypeScript error: Property 'monthly' does not exist on type 'SummaryStats'
```

```
/project:fix Backend panics on CSV import with "column count mismatch"
```

```
/project:fix Sidebar active state not updating when navigating to /analytics
```

Claude reads the relevant code, identifies the root cause, applies a minimal fix, and re-runs the failing check.

### Running verification

After any change, verify with a specific target:

```
/project:verify frontend    # TypeScript compilation + dev server
/project:verify backend     # Docker build + health check + API smoke test
/project:verify all         # Both
/project:verify 06          # Run the verification section from prompt 06
```

---

## Tips

- **Run prompts in order.** Each step assumes the previous ones are complete. Skipping steps will cause missing dependencies.
- **You can re-run a step.** `build-step` checks existing code before writing, so re-running a step updates rather than overwrites.
- **Combine commands for larger features.** Use `backend-api` to add the endpoint, then `frontend-design` to build the UI for it.
- **Use `verify` liberally.** Run it after every step and after any manual changes.
- **Use `fix` instead of debugging manually.** It knows the common gotchas (missing `"use client"`, route ordering, SQLx type casting) and checks them automatically.
