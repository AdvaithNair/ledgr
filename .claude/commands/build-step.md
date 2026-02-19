# Build Step — Execute a numbered prompt

You are building the Ledgr personal finance dashboard. The user wants to execute a specific implementation step.

## Usage

The argument is a prompt number or partial filename, e.g. `03`, `05-import-page`, `4`.

## Instructions

1. **Find the prompt file:** Look in `prompts/` for a file matching `$ARGUMENTS` (fuzzy match on the number prefix, e.g. `03` matches `03-backend-api.md`). If no argument is provided, list all available prompts in `prompts/` and ask which one to run.

2. **Read the prompt file** in full — every task, code snippet, and verification step.

3. **Read `CLAUDE.md`** for project conventions. All code you write must follow these conventions exactly.

4. **Check existing code before writing.** Earlier steps may have already created files. Read any files that already exist in the paths you're about to write to. Do not overwrite working code from prior steps — extend or update it instead.

5. **Execute all tasks sequentially** as described in the prompt file. Follow the order given. For each task:
    - Read any existing file at the target path first
    - Write the code exactly as specified, adapting to any existing code
    - Follow naming conventions (Rust: snake_case, Frontend: kebab-case files, PascalCase components, camelCase functions)

6. **Run all verification steps** listed in the prompt's "Verification" section. Execute each check and report pass/fail.

7. **Report results** — summarize what was created/modified and verification outcomes.

## Key Conventions

- Backend: Rust/Axum, routes in `backend/src/routes/`, models in `models/`, services in `services/`
- Frontend: Next.js App Router, `src/app/` for routes, `src/components/` for UI, `src/lib/` for utilities
- All API responses: `{ data?, error?, meta? }`
- Design tokens from Tailwind config — never hardcode hex values in components
- `"use client"` only when the component needs interactivity
- No external services, no analytics, no telemetry — fully local

IMPORTANT: for any frontend ui tasks, please use the /frontend-design skill / command to help style things. for any product related aspect (layout, interactivity tests, etc), use the /product-design skill / command.
