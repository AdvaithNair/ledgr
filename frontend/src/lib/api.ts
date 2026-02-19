import { API_BASE } from "./constants";
import type {
  Card,
  NewCard,
  UserConfig,
  TransactionsResponse,
  ImportResult,
  ImportRecord,
  SummaryStats,
  MonthlyData,
  MerchantData,
  PatternData,
  ForecastData,
  Insight,
  CategoryAnomaly,
  RecurringTransaction,
  HabitAnalysis,
  DailySpending,
  CategoryDeepDive,
  Budget,
  BudgetProgress,
} from "@/types";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Cards ──

export async function getCards(): Promise<{ data: Card[] }> {
  return fetcher("/cards");
}

export async function createCard(card: NewCard): Promise<{ data: Card }> {
  return fetcher("/cards", {
    method: "POST",
    body: JSON.stringify(card),
  });
}

export async function updateCard(
  id: string,
  updates: Partial<NewCard>
): Promise<{ data: Card }> {
  return fetcher(`/cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteCard(id: string): Promise<void> {
  return fetcher(`/cards/${id}`, { method: "DELETE" });
}

// ── User Config ──

export async function getConfig(): Promise<{ data: UserConfig }> {
  return fetcher("/config");
}

export async function updateConfig(config: UserConfig): Promise<void> {
  return fetcher("/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

// ── Transactions ──

export async function getTransactions(
  params?: Record<string, string>
): Promise<TransactionsResponse> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return fetcher(`/transactions${query}`);
}

export async function deleteAllTransactions(): Promise<void> {
  return fetcher("/transactions", { method: "DELETE" });
}

export async function updateCategory(
  id: string,
  category: string
): Promise<void> {
  return fetcher(`/transactions/${id}/category`, {
    method: "PUT",
    body: JSON.stringify({ category }),
  });
}

export async function bulkUpdateCategory(
  ids: string[],
  category: string
): Promise<void> {
  return fetcher("/transactions/bulk-category", {
    method: "PUT",
    body: JSON.stringify({ ids, category }),
  });
}

// ── Import ──

export async function importCSV(
  file: File,
  cardCode?: string
): Promise<{ data: ImportResult }> {
  const formData = new FormData();
  formData.append("file", file);
  if (cardCode) formData.append("card_code", cardCode);

  const res = await fetch(`${API_BASE}/transactions/import`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Import failed: ${res.status}`);
  }
  return res.json();
}

export async function getImportHistory(): Promise<{ data: ImportRecord[] }> {
  return fetcher("/import-history");
}

// ── Stats ──

export async function getSummary(): Promise<{ data: SummaryStats }> {
  return fetcher("/stats/summary");
}

export async function getMonthly(): Promise<{ data: MonthlyData }> {
  return fetcher("/stats/monthly");
}

export async function getMerchants(): Promise<{ data: MerchantData[] }> {
  return fetcher("/stats/merchants");
}

export async function getPatterns(): Promise<{ data: PatternData }> {
  return fetcher("/stats/patterns");
}

// ── Enhanced Stats ──

export async function getForecast(): Promise<{ data: ForecastData }> {
  return fetcher("/stats/forecast");
}

export async function getInsights(): Promise<{ data: Insight[] }> {
  return fetcher("/stats/insights");
}

export async function getAnomalies(): Promise<{
  data: {
    category_anomalies: CategoryAnomaly[];
    transaction_anomalies: unknown[];
  };
}> {
  return fetcher("/stats/anomalies");
}

export async function getRecurring(): Promise<{
  data: {
    recurring: RecurringTransaction[];
    total_monthly_recurring: number;
    total_annual_recurring: number;
  };
}> {
  return fetcher("/stats/recurring");
}

export async function getHabits(): Promise<{ data: HabitAnalysis }> {
  return fetcher("/stats/habits");
}

export async function getDaily(
  start?: string,
  end?: string
): Promise<{ data: DailySpending[] }> {
  const params = new URLSearchParams();
  if (start) params.set("start_date", start);
  if (end) params.set("end_date", end);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetcher(`/stats/daily${query}`);
}

export async function getCategoryDeepDive(
  category: string
): Promise<{ data: CategoryDeepDive }> {
  return fetcher(`/stats/category/${encodeURIComponent(category)}`);
}

// ── Budgets ──

export async function getBudgets(): Promise<{ data: Budget[] }> {
  return fetcher("/budgets");
}

export async function upsertBudget(
  category: string,
  monthlyLimit: number
): Promise<{ data: Budget }> {
  return fetcher("/budgets", {
    method: "POST",
    body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
  });
}

export async function deleteBudget(id: string): Promise<void> {
  return fetcher(`/budgets/${id}`, { method: "DELETE" });
}

export async function getBudgetProgress(): Promise<{ data: BudgetProgress[] }> {
  return fetcher("/budgets/progress");
}
