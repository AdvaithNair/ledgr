# Ledgr

A local-first personal finance dashboard for tracking credit card spending. Import CSV statements from any card, visualize spending patterns, detect anomalies, and forecast future spending — all running entirely on your machine with zero external services.

## Tech Stack

- **Backend:** Rust (Axum) + PostgreSQL 16 — containerized with Docker Compose
- **Frontend:** Next.js 14 (App Router, TypeScript, Tailwind CSS, Recharts, Framer Motion)
- **Data:** SQLx for type-safe queries, SHA-256 transaction hashing for deduplication

## What It Does

- **CSV Import** — Drag-and-drop CSV files from Amex, Citi, Capital One, or any custom card. Auto-detects card type from headers, deduplicates overlapping imports, and auto-categorizes transactions.
- **Dashboard** — Animated spending overview with stat cards, monthly trend charts, category breakdown donut, card comparison bars, top merchants, spending velocity projection, anomaly alerts, and a smart insights carousel.
- **Transactions** — Filterable, sortable, paginated table with search, inline category editing, bulk updates, and expandable raw CSV data per row.
- **Analytics** — Category trends (stacked area), day-of-week/day-of-month patterns, monthly accordion breakdowns, calendar heatmap, spending forecasts (linear + EWMA + day-weighted), recurring/subscription detection, behavioral habit analysis, and category deep-dive modals.
- **Budgets** — Optional per-category monthly limits with progress bars and projection-based warnings.
- **Settings** — Add/remove credit cards with custom CSV column mappings and colors. Configure user identity for multi-cardholder filtering.

## Running

```bash
# Backend + database
docker-compose up

# Frontend (separate terminal)
cd frontend && npm run dev
```

Backend: `http://localhost:8080` | Frontend: `http://localhost:3000`

## Privacy

Fully local. No accounts, no cloud sync, no analytics, no telemetry. Your financial data never leaves your machine.
