# Ledgr — Setup Guide

## Prerequisites

Install the following before starting:

| Tool | Purpose | Install |
|------|---------|---------|
| **Docker Desktop** | Runs backend + PostgreSQL | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Bun** | Frontend package manager & runtime | `curl -fsSL https://bun.sh/install \| bash` |
| **Node.js 20+** | Required by Next.js | Comes with Bun, or install via [nodejs.org](https://nodejs.org/) |
| **Git** | Version control | `brew install git` (macOS) |

Optional but recommended:

| Tool | Purpose | Install |
|------|---------|---------|
| **Postico** | PostgreSQL GUI client | [eggerapps.at/postico2](https://eggerapps.at/postico2/) |
| **Rust toolchain** | Only needed if developing backend outside Docker | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

## Quick Start

### 1. Clone the repo

```bash
git clone <repo-url> && cd Ledgr
```

### 2. Start backend + database

```bash
docker compose up --build -d
```

This launches:
- **PostgreSQL 16** on `localhost:5432`
- **Rust/Axum backend** on `localhost:8080`

Migrations run automatically on backend startup. Wait for the backend container to show `listening on 0.0.0.0:8080` in logs:

```bash
docker compose logs -f backend
```

### 3. Start frontend

```bash
cd frontend
bun install
bun dev
```

Frontend runs on **http://localhost:3000**.

## Connecting to the Database

### Connection details

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5432` |
| User | `ledgr` |
| Password | `ledgr` |
| Database | `ledgr` |

### Connection URL

```
postgres://ledgr:ledgr@localhost:5432/ledgr
```

Paste this directly into Postico's "URL" field, or fill in the individual fields above.

### psql (command line)

```bash
docker compose exec db psql -U ledgr -d ledgr
```

## Running Tests

### Backend tests

```bash
# Set up test database (one-time)
bash backend/scripts/setup_test_db.sh

# Run all tests (needs running Docker containers for DB)
cd backend && cargo test

# Run unit tests only (no DB required)
cd backend && cargo test --lib
```

> Backend tests require the Rust toolchain installed locally — they don't run inside Docker.

### Frontend lint

```bash
cd frontend && bun run lint
```

## Rebuilding

After pulling new changes or modifying backend code:

```bash
docker compose up --build --force-recreate -d
```

The database volume persists across restarts. To fully reset the database:

```bash
docker compose down -v   # -v removes the volume
docker compose up --build -d
```

## Project Structure

```
Ledgr/
├── backend/
│   ├── src/
│   │   ├── main.rs          # Entry point, router setup
│   │   ├── routes/          # API endpoint handlers
│   │   ├── models/          # Database models & queries
│   │   └── services/        # Business logic
│   ├── migrations/          # SQL migrations (auto-run on startup)
│   ├── tests/               # Integration tests
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # React components
│       ├── lib/             # API client, utilities
│       └── types/           # TypeScript type definitions
├── docker-compose.yml
└── docs/                    # Architecture & design docs
```

## Troubleshooting

**Backend won't start:** Check that port 5432 isn't already in use by another PostgreSQL instance (`lsof -i :5432`).

**Frontend can't reach API:** Ensure Docker containers are running (`docker compose ps`). The backend must be healthy on `localhost:8080`.

**Database seems empty after restart:** This is expected on first run — import CSV transaction files through the UI.

**Need to re-run migrations:** Migrations are tracked and only run once. To force re-run, reset the database with `docker compose down -v` then `docker compose up --build -d`.
