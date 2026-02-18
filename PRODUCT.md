# Ledgr

## Goal

Give one person complete, private clarity over where their money goes — without surrendering data to anyone.

## Users

A single technically-comfortable individual who:
- Has 2–4 credit cards across different banks
- Wants to understand spending patterns, not just track balances
- Distrusts cloud finance apps with their data (or simply prefers owning it)
- Downloads CSV statements monthly (or less) and wants insights without spreadsheet gymnastics
- Cares about aesthetics — won't use something that looks like a tax form

## User Goals (Ranked)

1. **"Where did my money go?"** — See total spend and category breakdown at a glance
2. **"Am I spending more than usual?"** — Compare current period to historical trends
3. **"What's draining me?"** — Surface recurring charges, top merchants, and anomalies
4. **"Can I import painlessly?"** — Drop a CSV, have it just work, no duplicates
5. **"Am I on track?"** — Budget awareness without rigid budgeting workflows
6. **"Show me patterns I'd miss"** — Day-of-week habits, seasonal trends, merchant concentration

## Problems

### Solved
- **Cloud finance apps require bank credentials** — Ledgr uses CSV files, runs locally, zero network calls
- **CSV formats differ across banks** — Flexible column mapping per card, auto-detection from headers
- **Re-importing overlapping statements creates duplicates** — SHA-256 transaction hashing, safe partial imports
- **Authorized user charges inflate personal totals** — Name-based filtering excludes other cardholders
- **Generic dashboards bury the number you actually want** — Hero stat (total spent) is the largest element, always visible

### Open
- **Category accuracy degrades at scale** — Keyword matching is brittle; merchants change names, categories are ambiguous (is Costco groceries or shopping?)
- **No awareness of income** — Spending-only view can't answer "am I saving?" or "what's my burn rate?"
- **Monthly CSV download is friction** — The manual step of logging into each bank and exporting is the weakest link in the workflow
- **Multi-month analysis requires scrolling** — No way to compare arbitrary date ranges side-by-side
- **No mobile story** — Dashboard is desktop-first; quick "how much have I spent today?" checks aren't served

## Non-Goals

- **Not a budgeting app** — Budgets exist as optional guardrails, not the core experience. This isn't YNAB.
- **Not multi-user** — No accounts, no sharing, no household finance. One person, one machine.
- **Not real-time** — No bank API connections, no Plaid, no syncing. Data arrives via manual CSV import.
- **Not a tax tool** — No receipt tracking, no tax category tagging, no export to accountants.
- **Not a net worth tracker** — No assets, investments, or account balances. Strictly cash flow out.

## Design Constraints

- **Fully local** — No external API calls, no analytics, no telemetry. Docker + localhost only.
- **Dark theme only** — Background `#0A0A0F`, surfaces `#141419`, borders `#1E1E26`. No light mode.
- **Card-agnostic** — 3 presets (Amex, Citi, Capital One) but users can add any card with any color and CSV mapping.
- **No authentication** — Single-user local app. The machine IS the auth boundary.
- **Typography-driven** — JetBrains Mono for financial data (precision), Inter for UI chrome (clarity).
- **Progressive disclosure** — Most important info is biggest and first. Details on demand, never by default.

---

## Product Thinking

### Information Hierarchy

When the user opens Ledgr, this is what matters — in order:

1. **Total spent** (hero stat) — The one number that answers "where am I?"
2. **Trend direction** — Up or down vs. last month? This month vs. average?
3. **Category breakdown** — Where the money went, not just how much
4. **Card-level split** — Which card is carrying the weight?
5. **Top merchants** — Who's getting the most of my money?
6. **Anomalies / insights** — Things I wouldn't notice without computation
7. **Patterns** — Day-of-week, recurring, seasonal (deep analysis, not daily check)

### The Two Modes of Use

**Quick check (80% of visits):** "How much have I spent this month?" User opens dashboard, sees the hero number, maybe glances at the trend chart, closes. Under 10 seconds.

**Deep dive (20% of visits):** Usually after importing a new statement. User browses transactions, checks category breakdowns, looks at analytics, maybe adjusts a budget. 5–15 minutes.

The dashboard must nail the quick check. Analytics must reward the deep dive. These are different design problems.

### What Makes Ledgr Feel Good

- **The import moment** — Dropping a CSV and watching numbers populate is satisfying. The summary (X new, Y duplicates, Z filtered) gives confidence.
- **The hero stat** — A single, large, animated number creates focus. It's the opposite of a spreadsheet.
- **Card colors** — Seeing your actual cards represented with their brand colors creates a connection between the digital tool and the physical wallet.
- **Privacy certainty** — "This data is on my machine" is a feature that compounds trust over time.

### What Could Make It Better

- **Smarter categorization** — Merchant name normalization helps, but learning from user corrections would compound accuracy over time.
- **Time-boxed comparisons** — "How did December compare to last December?" is a natural question the UI doesn't yet make easy.
- **Import reminders** — If the app could surface "you haven't imported Amex data since January 15" it would reduce staleness.
- **Spending velocity** — "You're on pace to spend $X this month" is more actionable than "you've spent $Y so far."
- **Merchant intelligence** — Grouping transactions by merchant (all Amazon purchases, all Uber rides) for per-merchant trend views.

---

## Open Questions

_Space for unresolved product decisions. Add to this as questions arise._

- Should the dashboard have a configurable default time range, or is "current month" always right?
- Is there value in a "favorites" or "pinned merchants" concept for things the user tracks closely?
- How should empty states feel? First-time experience before any data is imported matters.
- Should analytics be one dense page or multiple focused tabs?
- Is there a useful "export" story? (PDF reports, sharing a summary image, etc.)
- Would a simple search-first interface (like Spotlight) be more useful than page-based navigation for power users?
- Should the sidebar show contextual stats (total this month, last import date) or stay purely navigational?

## Future Directions

_Ideas that aren't committed but are worth exploring._

- **Receipt photo → transaction matching** — OCR a receipt photo, match it to a CSV transaction, attach it. Still local-only.
- **Multi-year storytelling** — "Your 2025 in review" annual summary with year-over-year comparisons.
- **Goal tracking** — "I want to spend less than $X on dining this month" with progress and notifications.
- **CSV auto-detect from clipboard** — Paste CSV data directly instead of file upload.
- **Keyboard-first navigation** — Power user shortcuts for everything (vim-style?).
- **Spending alerts as local notifications** — "You've spent $500 on dining this month, 20% more than your average."
- **Tag system** — User-defined tags orthogonal to categories (e.g., "vacation", "work expense", "gift").
