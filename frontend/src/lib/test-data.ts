import type {
  EnhancedSummaryStats,
  MonthlyData,
  EnhancedMerchant,
  Card,
  ForecastData,
  Insight,
  CategoryAnomaly,
  RecurringTransaction,
  HabitAnalysis,
  DailySpending,
} from "@/types";

// Generate daily spending for the last 90 days
function generateDaily(): DailySpending[] {
  const days: DailySpending[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 80 : 50;
    const total = Math.round((base + Math.random() * 120) * 100) / 100;
    const count = Math.floor(1 + Math.random() * 5);
    days.push({
      date: d.toISOString().split("T")[0],
      total,
      count,
    });
  }
  return days;
}

// Generate 6 months of monthly data
function generateMonthly(): MonthlyData {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().split("T")[0].slice(0, 7));
  }

  const cards = ["AMEX", "CITI", "CAPONE"];
  const categories = ["Dining", "Groceries", "Shopping", "Subscriptions", "Gas", "Transportation", "Travel", "Health"];

  const monthly = months.map((month) => ({
    month,
    total: Math.round((1800 + Math.random() * 1200) * 100) / 100,
    count: Math.floor(30 + Math.random() * 40),
  }));

  const monthly_by_card = months.flatMap((month) =>
    cards.map((card) => ({
      month,
      card,
      total: Math.round((400 + Math.random() * 600) * 100) / 100,
    }))
  );

  const monthly_by_category = months.flatMap((month) =>
    categories.map((category) => ({
      month,
      category,
      total: Math.round((100 + Math.random() * 400) * 100) / 100,
    }))
  );

  return { monthly, monthly_by_card, monthly_by_category };
}

export const TEST_CARDS: Card[] = [
  {
    id: "test-1",
    code: "AMEX",
    label: "Amex Gold",
    color: "#C5A44E",
    header_pattern: null,
    date_column: "Date",
    date_format: null,
    description_column: "Description",
    amount_column: "Amount",
    debit_column: null,
    credit_column: null,
    category_column: "Category",
    member_column: null,
    skip_negative_amounts: false,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "test-2",
    code: "CITI",
    label: "Citi Double Cash",
    color: "#0066B2",
    header_pattern: null,
    date_column: "Date",
    date_format: null,
    description_column: "Description",
    amount_column: "Debit",
    debit_column: "Debit",
    credit_column: "Credit",
    category_column: null,
    member_column: "Member Name",
    skip_negative_amounts: false,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "test-3",
    code: "CAPONE",
    label: "Capital One Venture",
    color: "#D42427",
    header_pattern: null,
    date_column: "Transaction Date",
    date_format: null,
    description_column: "Description",
    amount_column: "Debit",
    debit_column: "Debit",
    credit_column: "Credit",
    category_column: "Category",
    member_column: null,
    skip_negative_amounts: true,
    created_at: "2025-01-01T00:00:00Z",
  },
];

export const TEST_SUMMARY: EnhancedSummaryStats = {
  total_spent: 14523.87,
  transaction_count: 247,
  this_month: 2341.56,
  last_month: 2187.32,
  mom_change_pct: 7.05,
  avg_monthly: 2420.65,
  vs_avg_pct: -3.27,
  daily_rate: 137.74,
  projected_month_total: 2478.12,
  by_card: [
    { card: "AMEX", total: 6234.12, count: 98, avg_amount: 63.61 },
    { card: "CITI", total: 4891.55, count: 87, avg_amount: 56.22 },
    { card: "CAPONE", total: 3398.20, count: 62, avg_amount: 54.81 },
  ],
  by_category: [
    { category: "Dining", total: 3245.67, count: 68, avg_amount: 47.73 },
    { category: "Groceries", total: 2876.43, count: 52, avg_amount: 55.32 },
    { category: "Shopping", total: 2134.89, count: 34, avg_amount: 62.79 },
    { category: "Subscriptions", total: 1567.32, count: 24, avg_amount: 65.31 },
    { category: "Gas", total: 1432.11, count: 28, avg_amount: 51.15 },
    { category: "Transportation", total: 1123.45, count: 18, avg_amount: 62.41 },
    { category: "Travel", total: 987.65, count: 8, avg_amount: 123.46 },
    { category: "Health", total: 756.35, count: 15, avg_amount: 50.42 },
  ],
};

export const TEST_MONTHLY: MonthlyData = generateMonthly();

export const TEST_MERCHANTS: EnhancedMerchant[] = [
  {
    merchant: "Whole Foods",
    total: 1234.56,
    count: 24,
    avg_amount: 51.44,
    first_seen: "2025-08-15",
    last_seen: "2026-02-12",
    active_months: 6,
    monthly_frequency: 4.0,
  },
  {
    merchant: "Sweetgreen",
    total: 876.32,
    count: 36,
    avg_amount: 24.34,
    first_seen: "2025-09-01",
    last_seen: "2026-02-14",
    active_months: 5,
    monthly_frequency: 7.2,
  },
  {
    merchant: "Amazon",
    total: 743.21,
    count: 15,
    avg_amount: 49.55,
    first_seen: "2025-08-20",
    last_seen: "2026-02-10",
    active_months: 6,
    monthly_frequency: 2.5,
  },
  {
    merchant: "Shell Gas Station",
    total: 654.87,
    count: 14,
    avg_amount: 46.78,
    first_seen: "2025-09-05",
    last_seen: "2026-02-08",
    active_months: 5,
    monthly_frequency: 2.8,
  },
  {
    merchant: "Target",
    total: 534.12,
    count: 8,
    avg_amount: 66.77,
    first_seen: "2025-10-01",
    last_seen: "2026-01-28",
    active_months: 4,
    monthly_frequency: 2.0,
  },
  {
    merchant: "Uber Eats",
    total: 432.65,
    count: 18,
    avg_amount: 24.04,
    first_seen: "2025-11-01",
    last_seen: "2026-02-15",
    active_months: 3,
    monthly_frequency: 6.0,
  },
];

export const TEST_FORECAST: ForecastData = {
  current_month: {
    spent_so_far: 2341.56,
    days_elapsed: 17,
    days_remaining: 11,
    days_in_month: 28,
  },
  projections: {
    linear: 2478.12,
    day_weighted: 2512.34,
    ewma: 2456.78,
    recommended: 2478.12,
  },
  vs_last_month: {
    last_month_total: 2187.32,
    projected_change_pct: 13.28,
  },
  vs_average: {
    avg_monthly: 2420.65,
    projected_change_pct: 2.37,
  },
  category_forecasts: [
    { category: "Dining", spent_so_far: 612.34, projected: 1008.45, avg_monthly: 876.23, vs_avg_pct: 15.09, trend: "up" },
    { category: "Groceries", spent_so_far: 489.12, projected: 805.67, avg_monthly: 812.45, vs_avg_pct: -0.83, trend: "stable" },
    { category: "Shopping", spent_so_far: 367.89, projected: 605.45, avg_monthly: 534.23, vs_avg_pct: 13.33, trend: "up" },
    { category: "Subscriptions", spent_so_far: 287.45, projected: 312.34, avg_monthly: 298.56, vs_avg_pct: 4.61, trend: "stable" },
    { category: "Gas", spent_so_far: 198.76, projected: 327.12, avg_monthly: 345.67, vs_avg_pct: -5.37, trend: "down" },
    { category: "Transportation", spent_so_far: 156.23, projected: 257.34, avg_monthly: 234.56, vs_avg_pct: 9.71, trend: "up" },
  ],
  trajectory: "near_average",
};

export const TEST_INSIGHTS: Insight[] = [
  {
    type: "anomaly",
    severity: "high",
    icon: "!",
    title: "Dining Spike",
    message: "Dining spending is 42% above your 3-month average this month.",
    metric: { value: 612.34, comparison: 431.12, unit: "$" },
    action: "Review dining transactions",
    category: "Dining",
  },
  {
    type: "positive",
    severity: "low",
    icon: "+",
    title: "Gas Savings",
    message: "Gas spending is down 18% compared to your average — nice work!",
    metric: { value: 198.76, comparison: 242.34, unit: "$" },
    category: "Gas",
  },
  {
    type: "trend",
    severity: "medium",
    icon: "~",
    title: "Weekend Pattern",
    message: "You spend 45% more on weekends than weekdays. Consider a weekend budget.",
    metric: { value: 89.34, comparison: 61.56, unit: "$/day" },
  },
  {
    type: "recurring",
    severity: "low",
    icon: "R",
    title: "Subscription Check",
    message: "You have 8 active subscriptions totaling $287.45/mo ($3,449/yr).",
    metric: { value: 287.45, comparison: 0, unit: "$/mo" },
  },
  {
    type: "habit",
    severity: "medium",
    icon: "H",
    title: "Impulse Spending",
    message: "23% of transactions are under $15 — small purchases add up to $156/mo.",
  },
];

export const TEST_ANOMALIES: CategoryAnomaly[] = [
  {
    category: "Dining",
    current_month: 612.34,
    avg_monthly: 431.12,
    stddev: 67.89,
    z_score: 2.67,
    severity: "high",
    pct_above_avg: 42.04,
    message: "Dining is significantly above average this month.",
  },
  {
    category: "Shopping",
    current_month: 367.89,
    avg_monthly: 287.45,
    stddev: 45.23,
    z_score: 1.78,
    severity: "elevated",
    pct_above_avg: 27.98,
    message: "Shopping is moderately above average.",
  },
  {
    category: "Transportation",
    current_month: 156.23,
    avg_monthly: 112.34,
    stddev: 23.45,
    z_score: 1.87,
    severity: "elevated",
    pct_above_avg: 39.07,
    message: "Transportation spending has increased this month.",
  },
];

export const TEST_RECURRING: RecurringTransaction[] = [
  { merchant: "Netflix", avg_amount: 15.99, frequency: "monthly", active_months: 6, first_seen: "2025-08-15", last_seen: "2026-02-15", estimated_annual: 191.88, status: "active", last_gap_days: 30, potentially_forgotten: false },
  { merchant: "Spotify", avg_amount: 10.99, frequency: "monthly", active_months: 6, first_seen: "2025-08-20", last_seen: "2026-02-20", estimated_annual: 131.88, status: "active", last_gap_days: 30, potentially_forgotten: false },
  { merchant: "iCloud Storage", avg_amount: 2.99, frequency: "monthly", active_months: 6, first_seen: "2025-08-01", last_seen: "2026-02-01", estimated_annual: 35.88, status: "active", last_gap_days: 31, potentially_forgotten: false },
  { merchant: "ChatGPT Plus", avg_amount: 20.00, frequency: "monthly", active_months: 4, first_seen: "2025-10-15", last_seen: "2026-02-15", estimated_annual: 240.00, status: "active", last_gap_days: 31, potentially_forgotten: false },
  { merchant: "Gym Membership", avg_amount: 49.99, frequency: "monthly", active_months: 6, first_seen: "2025-08-01", last_seen: "2026-02-01", estimated_annual: 599.88, status: "active", last_gap_days: 31, potentially_forgotten: false },
  { merchant: "NYT Digital", avg_amount: 17.00, frequency: "monthly", active_months: 5, first_seen: "2025-09-10", last_seen: "2026-02-10", estimated_annual: 204.00, status: "active", last_gap_days: 31, potentially_forgotten: false },
  { merchant: "Adobe CC", avg_amount: 54.99, frequency: "monthly", active_months: 3, first_seen: "2025-11-15", last_seen: "2026-01-15", estimated_annual: 659.88, status: "active", last_gap_days: 33, potentially_forgotten: false },
  { merchant: "Crunchyroll", avg_amount: 7.99, frequency: "monthly", active_months: 2, first_seen: "2025-12-01", last_seen: "2026-01-01", estimated_annual: 95.88, status: "inactive", last_gap_days: 47, potentially_forgotten: true },
];

export const TEST_HABITS: HabitAnalysis = {
  impulse_spending: {
    score: 34,
    label: "Moderate",
    small_transaction_pct: 23.4,
    avg_small_amount: 8.67,
    monthly_small_total: 156.23,
    message: "About a quarter of your transactions are small impulse purchases under $15.",
  },
  category_creep: [
    { category: "Dining", trend: "increasing", three_month_change_pct: 18.5, monthly_totals: [387.12, 431.12, 512.34], message: "Dining has been steadily increasing." },
    { category: "Gas", trend: "decreasing", three_month_change_pct: -15.2, monthly_totals: [267.89, 234.56, 198.76], message: "Gas spending is trending down." },
    { category: "Groceries", trend: "stable", three_month_change_pct: 2.1, monthly_totals: [478.23, 489.12, 495.67], message: "Groceries remain stable." },
    { category: "Shopping", trend: "increasing", three_month_change_pct: 22.3, monthly_totals: [245.67, 287.45, 367.89], message: "Shopping is creeping up." },
  ],
  weekend_splurge: {
    weekend_avg_daily: 89.34,
    weekday_avg_daily: 61.56,
    ratio: 1.45,
    label: "Moderate",
    message: "Weekend spending is 45% higher than weekdays.",
  },
  subscription_bloat: {
    total_monthly: 287.45,
    total_annual: 3449.40,
    count: 8,
    potentially_forgotten: ["Crunchyroll"],
    message: "8 subscriptions at $287/mo. Crunchyroll may be unused.",
  },
  merchant_concentration: {
    top_merchant: "Whole Foods",
    top_merchant_pct: 14.2,
    top_3_pct: 32.8,
    hhi: 0.087,
    label: "Diversified",
    message: "Spending is well-distributed across merchants.",
  },
};

export const TEST_DAILY: DailySpending[] = generateDaily();
