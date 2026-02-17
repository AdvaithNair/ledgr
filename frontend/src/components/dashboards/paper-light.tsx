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
import { formatCurrency } from "@/lib/utils";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  ForecastData,
  CategoryAnomaly,
  RecurringTransaction,
  Insight,
} from "@/types";

interface PaperLightProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}

export function PaperLight({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: PaperLightProps) {
  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  const momChange = summary.mom_change_pct;
  const vsAvg = summary.vs_avg_pct;

  return (
    <div
      className="mx-auto max-w-3xl min-h-screen"
      style={{
        backgroundColor: "#FAFAF8",
        color: "#1A1A1A",
        borderRadius: "24px 24px 0 0",
        padding: "0 24px",
        boxShadow: "0 0 80px rgba(0,0,0,0.3)",
        fontFamily: "var(--font-source-serif)",
      }}
    >
      {/* Hero Section */}
      <motion.div
        className="pt-20 pb-16 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <p
          className="text-xs uppercase mb-4"
          style={{ letterSpacing: "0.2em", color: "#9CA3AF" }}
        >
          This Month
        </p>
        <p
          className="text-6xl font-bold"
          style={{ fontFamily: "var(--font-fraunces)", color: "#1A1A1A" }}
        >
          {formatCurrency(summary.this_month)}
        </p>
        <div className="mt-4 space-y-1">
          {momChange !== null && (
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              {momChange > 0 ? "+" : ""}
              {momChange.toFixed(1)}% vs last month
            </p>
          )}
          {vsAvg !== null && (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {vsAvg > 0 ? "+" : ""}
              {vsAvg.toFixed(1)}% vs average
            </p>
          )}
        </div>
      </motion.div>

      {/* Chart */}
      {monthly && monthly.monthly.length > 0 && (
        <div className="pb-8">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly.monthly}>
              <defs>
                <linearGradient id="paperGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  color: "#1A1A1A",
                }}
                formatter={(v?: number) =>
                  v !== undefined ? [formatCurrency(v), "Spent"] : ["—", "Spent"]
                }
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#1A1A1A"
                strokeWidth={1.5}
                fill="url(#paperGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="relative flex items-center justify-center py-8">
        <div
          className="absolute inset-x-16 h-px"
          style={{ backgroundColor: "#E5E7EB" }}
        />
        <span
          className="relative px-4 text-xs uppercase"
          style={{
            backgroundColor: "#FAFAF8",
            letterSpacing: "0.2em",
            color: "#9CA3AF",
          }}
        >
          details
        </span>
      </div>

      {/* Top Drivers Section */}
      {anomalies.length > 0 && (
        <div className="py-8" style={{ borderTop: "1px solid #E5E7EB" }}>
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "#1A1A1A" }}
          >
            What&apos;s driving this?
          </h2>
          <div className="space-y-4">
            {anomalies.slice(0, 3).map((anomaly) => (
              <motion.div
                key={anomaly.category}
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <span className="text-sm" style={{ color: "#1A1A1A" }}>
                  {anomaly.category}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm"
                    style={{ color: "#1A1A1A" }}
                  >
                    {formatCurrency(anomaly.current_month)}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "#DC2626" }}
                  >
                    +{anomaly.pct_above_avg.toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring Section */}
      {activeRecurring.length > 0 && (
        <div className="py-8" style={{ borderTop: "1px solid #E5E7EB" }}>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#1A1A1A" }}
          >
            Recurring
          </h2>
          <p
            className="font-mono text-3xl"
            style={{ color: "#1A1A1A" }}
          >
            {formatCurrency(recurringTotal)}
          </p>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            {activeRecurring.length} active subscription
            {activeRecurring.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Top Insight */}
      {insights && insights[0] && (
        <div className="py-8" style={{ borderTop: "1px solid #E5E7EB" }}>
          <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
            {insights[0].message}
          </p>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-16" />
    </div>
  );
}
