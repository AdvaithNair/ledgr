# Fix — Debug and resolve issues in Ledgr

Troubleshoot and fix the following issue: $ARGUMENTS

## Instructions

1. **Read `CLAUDE.md`** for project conventions — your fix must follow them.

2. **Identify the domain** from the error description:
   - TypeScript/React/Next.js/Tailwind errors → frontend issue
   - Rust/Axum/SQLx/Docker errors → backend issue
   - If unclear, check both.

3. **Gather context:**
   - Read the relevant source files mentioned in the error
   - Check recent changes that might have introduced the issue
   - For frontend: check `frontend/src/` files, `tsconfig.json`, `tailwind.config.ts`
   - For backend: check `backend/src/` files, `Cargo.toml`, `docker-compose.yml`

4. **Common frontend issues to check:**
   - Missing `"use client"` directive on components using hooks/event handlers
   - TypeScript type mismatches — check `src/types/index.ts`
   - Import path errors — verify file exists at the imported path
   - Tailwind classes not working — check `tailwind.config.ts` for custom tokens
   - Missing dependencies — check `package.json`
   - Next.js App Router gotchas (server vs client components, metadata exports)

5. **Common backend issues to check:**
   - `Cargo.toml` missing dependencies or feature flags
   - SQLx query type mismatches (especially `amount::float8` casting)
   - Route registration order (`/bulk-category` must come before `/{id}`)
   - Missing `mod` declarations in `mod.rs` files
   - CORS configuration not allowing `localhost:3000`
   - Docker build issues — check Dockerfile and docker-compose.yml

6. **Apply a minimal, targeted fix.** Do not refactor surrounding code or make unrelated changes. Fix only what's broken.

7. **Verify the fix:**
   - For frontend: run `npx tsc --noEmit` from `frontend/`
   - For backend: run `docker-compose up --build`
   - Run whatever command was originally failing to confirm it now passes.

8. **Report** what was wrong, what you changed, and confirmation that the fix works.
