// ── Card Config (from DB, user can add custom cards) ──

export interface Card {
  id: string;
  code: string;
  label: string;
  color: string;
  header_pattern: string | null;
  date_column: string | null;
  date_format: string | null;
  description_column: string | null;
  amount_column: string | null;
  debit_column: string | null;
  credit_column: string | null;
  category_column: string | null;
  member_column: string | null;
  skip_negative_amounts: boolean;
  created_at: string;
}

export interface NewCard {
  code: string;
  label: string;
  color: string;
  header_pattern?: string;
  date_column?: string;
  date_format?: string;
  description_column?: string;
  amount_column?: string;
  debit_column?: string;
  credit_column?: string;
  category_column?: string;
  member_column?: string;
  skip_negative_amounts?: boolean;
}

// ── User Config ──

export interface UserConfig {
  user_name?: string;
  [key: string]: string | undefined;
}

// ── Transactions ──

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  card: string;
  card_label: string;
  raw_data: Record<string, string> | null;
  hash: string;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface ImportResult {
  card: string;
  card_label: string;
  file_name: string;
  new_count: number;
  duplicate_count: number;
  skipped_user_count: number;
  total_parsed: number;
}

export interface ImportRecord {
  id: string;
  imported_at: string;
  card: string;
  file_name: string;
  transaction_count: number;
  duplicate_count: number;
  skipped_user_count: number;
}

export interface SummaryStats {
  total_spent: number;
  transaction_count: number;
  this_month: number;
  last_month: number;
  by_card: Array<{ card: string; total: number; count: number }>;
  by_category: Array<{ category: string; total: number; count: number }>;
}

export interface MonthlyData {
  monthly: Array<{ month: string; total: number; count: number }>;
  monthly_by_card: Array<{ month: string; card: string; total: number }>;
  monthly_by_category: Array<{ month: string; category: string; total: number }>;
}

export interface MerchantData {
  merchant: string;
  total: number;
  count: number;
}

export interface PatternData {
  day_of_week: Array<{ day: string; day_num: number; total: number; count: number }>;
  day_of_month: Array<{ day: number; total: number; count: number }>;
}

// ── Enhanced Types (for dashboard designs) ──

export interface EnhancedSummaryStats extends SummaryStats {
  mom_change_pct: number | null;
  avg_monthly: number;
  vs_avg_pct: number | null;
  daily_rate: number;
  projected_month_total: number;
  by_category: Array<{
    category: string;
    total: number;
    count: number;
    avg_amount: number;
  }>;
  by_card: Array<{
    card: string;
    total: number;
    count: number;
    avg_amount: number;
  }>;
}

export interface EnhancedMerchant {
  merchant: string;
  total: number;
  count: number;
  avg_amount: number;
  first_seen: string;
  last_seen: string;
  active_months: number;
  monthly_frequency: number;
}

export interface ForecastData {
  current_month: {
    spent_so_far: number;
    days_elapsed: number;
    days_remaining: number;
    days_in_month: number;
  };
  projections: {
    linear: number;
    day_weighted: number;
    ewma: number;
    recommended: number;
  };
  vs_last_month: {
    last_month_total: number;
    projected_change_pct: number;
  };
  vs_average: {
    avg_monthly: number;
    projected_change_pct: number;
  };
  category_forecasts: Array<{
    category: string;
    spent_so_far: number;
    projected: number;
    avg_monthly: number;
    vs_avg_pct: number;
    trend: "up" | "down" | "stable";
  }>;
  trajectory: "below_average" | "near_average" | "above_average" | "well_above_average";
}

export interface Insight {
  type: "anomaly" | "trend" | "forecast" | "habit" | "recurring" | "milestone" | "positive";
  severity: "low" | "medium" | "high";
  icon: string;
  title: string;
  message: string;
  metric?: {
    value: number;
    comparison: number;
    unit: string;
  };
  action?: string;
  category?: string;
}

export interface CategoryAnomaly {
  category: string;
  current_month: number;
  avg_monthly: number;
  stddev: number;
  z_score: number;
  severity: "elevated" | "high" | "critical";
  pct_above_avg: number;
  message: string;
}

export interface RecurringTransaction {
  merchant: string;
  avg_amount: number;
  frequency: string;
  active_months: number;
  first_seen: string;
  last_seen: string;
  estimated_annual: number;
  status: "active" | "inactive";
  last_gap_days: number;
  potentially_forgotten: boolean;
}

export interface HabitAnalysis {
  impulse_spending: {
    score: number;
    label: string;
    small_transaction_pct: number;
    avg_small_amount: number;
    monthly_small_total: number;
    message: string;
  };
  category_creep: Array<{
    category: string;
    trend: "increasing" | "decreasing" | "stable";
    three_month_change_pct: number;
    monthly_totals: number[];
    message: string;
  }>;
  weekend_splurge: {
    weekend_avg_daily: number;
    weekday_avg_daily: number;
    ratio: number;
    label: string;
    message: string;
  };
  subscription_bloat: {
    total_monthly: number;
    total_annual: number;
    count: number;
    potentially_forgotten: string[];
    message: string;
  };
  merchant_concentration: {
    top_merchant: string;
    top_merchant_pct: number;
    top_3_pct: number;
    hhi: number;
    label: string;
    message: string;
  };
}

export interface DailySpending {
  date: string;
  total: number;
  count: number;
}
