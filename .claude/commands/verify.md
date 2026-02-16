# Verify — Run checks for Ledgr

Run verification checks for the project. Argument: $ARGUMENTS

## Instructions

Determine what to verify based on the argument:

### If argument is a number (e.g., `03`, `06`):

1. Find the matching prompt file in `prompts/` (fuzzy match on number prefix).
2. Read the **Verification** section of that prompt file.
3. Execute each verification step listed there.
4. Report each step as PASS or FAIL with details.

### If argument is `frontend`:

Run these checks from the `frontend/` directory:

1. **TypeScript compilation:** `npx tsc --noEmit` — should produce zero errors
2. **Dev server compiles:** `npm run dev` — check it starts without build errors (start it, wait for "Ready", then stop)
3. **Lint check:** `npm run lint` (if configured) — should pass
4. Report each check as PASS or FAIL.

### If argument is `backend`:

Run these checks:

1. **Docker build:** `docker-compose up --build -d` — should build and start without errors
2. **Health endpoint:** `curl -s localhost:8080/health` — should return OK/healthy response
3. **API smoke test:** `curl -s localhost:8080/api/transactions?page=1&per_page=1` — should return valid JSON with `data` and `meta` fields
4. Report each check as PASS or FAIL.

### If argument is `all`:

Run both `frontend` and `backend` checks above.

### If no argument:

List available verification targets:
- A number (01-08) to verify a specific prompt step
- `frontend` for frontend checks
- `backend` for backend checks
- `all` for everything

## Output Format

```
## Verification Results

- [PASS] Check description
- [FAIL] Check description — error details

Summary: X/Y checks passed
```
