"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import {
  ThemedBackground,
  ThemedPanel,
  ThemedLabel,
  useTooltipStyle,
  useChartGradientId,
  useNumericStyle,
} from "@/components/dashboards/themed-components";
import { formatCurrency } from "@/lib/utils";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  ForecastData,
  CategoryAnomaly,
  RecurringTransaction,
  Insight,
  HabitAnalysis,
  DailySpending,
  EnhancedMerchant,
  Card,
} from "@/types";

export interface DashboardLayoutProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
  habits: HabitAnalysis | null;
  daily: DailySpending[] | null;
  merchants: EnhancedMerchant[] | null;
  cards: Card[];
}

export function ZenFlow({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const numericStyle = useNumericStyle();
  const gradientId = useChartGradientId("zen");

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  const momChange = summary.mom_change_pct;
  const vsAvg = summary.vs_avg_pct;
  const isDark = theme.mode === "dark";
  const isPaper = theme.style === "paper";

  return (
    <ThemedBackground>
      <div
        className="relative mx-auto max-w-3xl"
        style={{
          fontFamily: theme.bodyFont,
          padding: isPaper ? "0 24px" : undefined,
        }}
      >
        {/* Hero Section */}
        <motion.div
          className="py-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        >
          <p
            className="mb-4 text-sm uppercase tracking-widest"
            style={{ color: theme.textMuted }}
          >
            This Month
          </p>
          <h1
            className="mb-4 text-6xl font-bold"
            style={{ fontFamily: theme.displayFont, color: theme.text }}
          >
            {formatCurrency(summary.this_month)}
          </h1>
          <div className="space-y-1 text-sm" style={{ color: theme.textMuted }}>
            {momChange !== null && (
              <p>
                {momChange >= 0 ? "+" : ""}
                {momChange.toFixed(1)}% vs last month
              </p>
            )}
            {vsAvg !== null && (
              <p>
                {vsAvg >= 0 ? "+" : ""}
                {vsAvg.toFixed(1)}% vs your average
              </p>
            )}
          </div>
        </motion.div>

        {/* Chart */}
        {monthly && monthly.monthly.length > 0 && (
          <div className="mb-6 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly.monthly}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={theme.chartStroke}
                      stopOpacity={isDark ? 0.2 : 0.08}
                    />
                    <stop
                      offset="100%"
                      stopColor={theme.chartStroke}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                {!isDark && (
                  <CartesianGrid stroke={theme.gridColor} strokeDasharray="3 3" />
                )}
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="transparent"
                  tick={{ fill: theme.axisColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v?: number) =>
                    v !== undefined ? [formatCurrency(v), "Spent"] : []
                  }
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={theme.chartStroke}
                  strokeWidth={isDark ? 2 : 1.5}
                  fill={`url(#${gradientId})`}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Scroll Indicator */}
        <div className="flex items-center justify-center py-8">
          {theme.style === "arctic" ? (
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke={theme.textMuted}
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </motion.div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div
                className="absolute inset-x-[-40px] h-px"
                style={{ backgroundColor: theme.border }}
              />
              <span
                className="relative px-4 text-xs uppercase"
                style={{
                  backgroundColor: theme.bg,
                  letterSpacing: "0.2em",
                  color: theme.textMuted,
                }}
              >
                details
              </span>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-6 py-12">
          {/* Top Drivers */}
          {anomalies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ThemedPanel className="px-8 py-10">
                <ThemedLabel className="mb-6">
                  What&apos;s driving this?
                </ThemedLabel>
                <div className="space-y-5">
                  {anomalies.slice(0, 3).map((a) => (
                    <div
                      key={a.category}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.7)"
                            : theme.text,
                        }}
                      >
                        {a.category}
                      </span>
                      <div className="flex items-center gap-4">
                        <span
                          className="text-sm"
                          style={{ ...numericStyle, color: theme.text }}
                        >
                          {formatCurrency(a.current_month)}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: isDark
                              ? theme.textMuted
                              : theme.danger,
                          }}
                        >
                          +{a.pct_above_avg.toFixed(0)}% above avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ThemedPanel>
            </motion.div>
          )}

          {/* Recurring */}
          {activeRecurring.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ThemedPanel className="px-8 py-10">
                <ThemedLabel className="mb-6">Recurring</ThemedLabel>
                <p
                  className="mb-1 text-3xl font-bold"
                  style={{
                    fontFamily: theme.displayFont,
                    color: theme.text,
                  }}
                >
                  {formatCurrency(recurringTotal)}
                </p>
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  {activeRecurring.length} active subscription
                  {activeRecurring.length !== 1 ? "s" : ""}
                </p>
              </ThemedPanel>
            </motion.div>
          )}

          {/* Top Insight */}
          {insights?.[0] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <ThemedPanel className="px-8 py-10">
                <ThemedLabel className="mb-6">Insight</ThemedLabel>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: isDark
                      ? "rgba(255,255,255,0.8)"
                      : theme.textMutedSmall,
                  }}
                >
                  {insights[0].message}
                </p>
              </ThemedPanel>
            </motion.div>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>
    </ThemedBackground>
  );
}
