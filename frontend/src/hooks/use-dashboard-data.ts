"use client";

import { useState, useEffect } from "react";
import {
  getSummary,
  getMonthly,
  getMerchants,
  getCards,
  getForecast,
  getInsights,
  getAnomalies,
  getRecurring,
  getHabits,
  getDaily,
} from "@/lib/api";
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

interface DashboardData {
  summary: EnhancedSummaryStats | null;
  monthly: MonthlyData | null;
  merchants: EnhancedMerchant[] | null;
  cards: Card[];
  forecast: ForecastData | null;
  insights: Insight[] | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  habits: HabitAnalysis | null;
  daily: DailySpending[] | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Omit<DashboardData, "loading" | "error">>({
    summary: null,
    monthly: null,
    merchants: null,
    cards: [],
    forecast: null,
    insights: null,
    anomalies: [],
    recurring: null,
    habits: null,
    daily: null,
  });

  useEffect(() => {
    Promise.all([
      getSummary(),
      getMonthly(),
      getMerchants(),
      getCards(),
      getForecast(),
      getInsights(),
      getAnomalies(),
      getRecurring(),
      getHabits(),
      getDaily(),
    ])
      .then(
        ([
          summary,
          monthly,
          merchants,
          cards,
          forecast,
          insights,
          anomalies,
          recurring,
          habits,
          daily,
        ]) => {
          setData({
            summary: summary.data as EnhancedSummaryStats,
            monthly: monthly.data,
            merchants: merchants.data as EnhancedMerchant[],
            cards: cards.data,
            forecast: forecast.data,
            insights: insights.data,
            anomalies: anomalies.data.category_anomalies || [],
            recurring: recurring.data.recurring,
            habits: habits.data,
            daily: daily.data,
          });
        }
      )
      .catch((err) => {
        console.error("Dashboard data fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading, error };
}
