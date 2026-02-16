# Features

## CSV Import

- Drag-and-drop or click-to-browse file upload
- Auto-detects card type from CSV headers using configurable keyword patterns
- Falls back to manual card selection dropdown when detection fails
- Client-side preview of first 20 rows before importing
- Server-side parsing with per-card column mappings (date, description, amount, debit/credit split, category)
- SHA-256 transaction hashing for deduplication — safe to re-import overlapping date ranges
- Authorized-user filtering: if a user name is configured, transactions from other cardholders on the same account are excluded via fuzzy matching
- Import history log tracking file name, card, new/duplicate/filtered counts per import
- Supports comma and tab delimiters with auto-detection

## Card Management

- Three presets: Amex Gold, Citi Costco, Capital One
- Users can add unlimited custom cards with: code, label, hex color, CSV header detection pattern, and column mappings for date, description, amount (or debit/credit), category, and member name
- Cards stored in the database, fully CRUD-managed from the settings page
- Card colors propagate throughout the UI: filter buttons, badges, chart segments, comparison bars

## Auto-Categorization

- Description-based keyword matching for: Dining, Groceries, Gas, Shopping, Subscriptions, Transportation, Travel, Health
- Amex CSV category column mapping (e.g., "Merchandise & Supplies-Groceries" maps to "Groceries")
- Capital One CSV category column used directly when present
- Manual override via inline editing or bulk category update on the transactions page

## Dashboard

- Animated count-up hero stat showing total spending
- Stat cards: this month, last month, average per month — with month-over-month and vs-average trend indicators
- Monthly spending trend area chart with rolling 3-month average overlay (dashed line)
- Category breakdown donut chart with custom colors
- Card comparison section: per-card total, transaction count, and proportional progress bars using card accent colors
- Top merchants list with normalized names, average per transaction, active months, and visit frequency
- Spending velocity card: daily rate, projected end-of-month total, and progress bars for month elapsed / budget trajectory
- Anomaly alert banner when any category has a z-score above threshold
- Smart insights carousel: horizontally scrollable cards surfacing the top findings (anomalies, trends, forecasts, habits)
- Period selector: This Month, Last Month, All Time

## Transactions Table

- Server-side pagination (50 per page, max 200)
- Multi-column sorting: date, amount, description, category, card
- Debounced search across transaction descriptions
- Card filter: toggle buttons per card (multi-select), dynamically rendered from configured cards
- Category filter dropdown
- Date range presets: 7d, 30d, 90d, YTD, All, Custom range
- Results summary: filtered transaction count and total
- Inline category editing: click a category badge to reassign via dropdown
- Bulk selection with select-all-on-page checkbox and bulk category update
- Expandable rows showing raw CSV data as key-value pairs
- Delete all transactions with confirmation

## Analytics

### Charts
- Category trends: stacked area chart of monthly spending per category with clickable legend items
- Day-of-week spending pattern bar chart
- Day-of-month spending pattern bar chart (1st–31st)
- Year-over-year grouped bar chart comparing the same months across years

### Calendar Heatmap
- GitHub-style grid of daily spending for the last 365 days
- 5-level intensity scale from surface color (no spend) through green quartiles to amber (outlier)
- Hover tooltips with date and dollar amount

### Monthly Accordion
- Expandable per-month breakdowns in reverse chronological order
- Per-month category bars with proportional widths, amounts, and percentages
- Per-month card bars with accent colors
- Most recent month expanded by default

### Forecasting
- End-of-month projection using three methods: linear extrapolation, day-of-month weighted, and EWMA (exponentially weighted moving average)
- Blended "recommended" projection averaging all three
- Gauge bar comparing projection to historical average, color-coded by trajectory
- Per-category forecast table with trend arrows and vs-average percentages
- Comparison stats: projected vs last month, projected vs historical average

### Recurring / Subscription Detection
- Identifies merchants appearing in 3+ months with consistent amounts (stddev < 20% of average)
- Active vs inactive status based on recency
- Flags potentially forgotten subscriptions (last seen 45+ days ago)
- Monthly and annual cost summaries

### Behavioral Habit Analysis
- **Impulse spending:** percentage of transactions under $15, monthly cost of small purchases
- **Weekend splurge:** weekend vs weekday average daily spend ratio
- **Merchant concentration:** top 3 merchant share of spending, HHI score
- **Category creep:** categories with 15%+ spending increase over 3 months, with mini sparklines
- **Subscription bloat:** total recurring cost and forgotten subscription alerts

### Category Deep Dive
- Modal triggered by clicking any category in charts, forecast table, or accordion
- Summary stats: total spent, transaction count, average amount
- Monthly trend area chart scoped to the category
- Top merchants within the category
- Day-of-week pattern within the category
- Recent transactions list

### Smart Insights Engine
- Aggregates signals from anomaly detection, trend analysis, forecasting, habit detection, and recurring tracking
- Ranks insights by priority score and returns the top 8
- Categories: anomaly alerts, trend changes, forecast warnings, habit flags, recurring insights, positive reinforcement

## Budgets (Optional)

- Per-category monthly spending limits, managed from the settings page
- Upsert semantics: one budget per category, updates in place
- Budget progress bars on the dashboard: spent vs limit with on-track/warning/over-budget status badges
- Projected end-of-month spend compared against budget limit
- Budget context in the analytics category forecast table
- Fully opt-in: all analytics work on historical averages without any budgets configured
- Zero empty states: budget UI sections only render when budgets exist

## Billing Period View

- Approximate 30-day billing cycle groupings derived from monthly data
- Date range, total, and transaction count per cycle
- Current/most recent period highlighted

## Settings

- **User identity:** configurable name used for authorized-user transaction filtering
- **Card management:** add, edit, delete cards with full CSV mapping configuration
- **Budget management:** add, edit, delete per-category monthly limits
