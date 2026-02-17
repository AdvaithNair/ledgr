"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

interface NeonDuskProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}

export function NeonDusk({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: NeonDuskProps) {
  const monthlyTrend = monthly?.monthly ?? [];
  const avg =
    monthlyTrend.length > 0
      ? monthlyTrend.reduce((s, m) => s + m.total, 0) / monthlyTrend.length
      : 0;

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce((s, r) => s + r.avg_amount, 0);

  const momChange = summary.mom_change_pct;

  return (
    <div
      className="min-h-screen"
      style={
        {
          "--dusk-accent": "#F472B6",
          "--dusk-secondary": "#A78BFA",
          "--dusk-muted": "rgba(244, 114, 182, 0.35)",
          background:
            "linear-gradient(135deg, rgba(244, 114, 182, 0.03) 0%, transparent 50%, rgba(167, 139, 250, 0.03) 100%)",
          fontFamily: "var(--font-lexend)",
          fontWeight: 300,
        } as React.CSSProperties
      }
    >
      <div className="max-w-3xl mx-auto px-6">
        {/* Hero Section */}
        <div className="py-16 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-sm uppercase tracking-[0.3em] mb-4"
            style={{ color: "var(--dusk-muted)" }}
          >
            This Month
          </motion.p>

          <motion.p
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1 }}
            style={{
              willChange: "filter",
              fontFamily: "var(--font-syne)",
              color: "var(--dusk-accent)",
            }}
            className="text-6xl font-bold mb-6"
          >
            {formatCurrency(summary.this_month)}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="space-y-1"
            style={{ color: "var(--dusk-muted)" }}
          >
            {momChange !== null && (
              <p className="text-sm">
                {momChange > 0 ? "+" : ""}
                {momChange.toFixed(1)}% vs last month
              </p>
            )}
            <p className="text-sm">
              Last month: {formatCurrency(summary.last_month)}
            </p>
          </motion.div>
        </div>

        {/* Chart */}
        {monthlyTrend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-8"
            style={{ filter: "drop-shadow(0 0 6px rgba(244, 114, 182, 0.25))" }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="duskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="20%" stopColor="#F472B6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fill: "rgba(244, 114, 182, 0.35)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#141419",
                    border: "1px solid #1E1E26",
                    borderRadius: "8px",
                    color: "#F472B6",
                  }}
                  labelStyle={{ color: "rgba(244, 114, 182, 0.5)" }}
                  formatter={(v?: number) => [
                    formatCurrency(v ?? 0),
                    "Spent",
                  ]}
                />
                <ReferenceLine
                  y={avg}
                  stroke="rgba(167, 139, 250, 0.3)"
                  strokeDasharray="4 4"
                  label={{
                    value: "avg",
                    position: "right",
                    fill: "rgba(167, 139, 250, 0.5)",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#F472B6"
                  strokeWidth={2}
                  fill="url(#duskGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Scroll Indicator */}
        <div className="flex justify-center gap-3 py-8">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
              style={{ color: "var(--dusk-accent)", fontSize: "18px" }}
            >
              &middot;
            </motion.span>
          ))}
        </div>

        {/* Top Drivers */}
        {anomalies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2
              className="text-lg font-medium text-white/90 mb-6"
              style={{ textShadow: "0 0 30px rgba(244, 114, 182, 0.15)" }}
            >
              What&apos;s driving this?
            </h2>
            <div className="space-y-4">
              {anomalies.slice(0, 3).map((a, i) => (
                <motion.div
                  key={a.category}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  className="flex items-center justify-between py-3 border-b"
                  style={{ borderColor: "rgba(244, 114, 182, 0.08)" }}
                >
                  <span className="text-white">{a.category}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-white/80">
                      {formatCurrency(a.current_month)}
                    </span>
                    <span
                      className="text-sm font-mono"
                      style={{ color: "var(--dusk-secondary)" }}
                    >
                      +{a.pct_above_avg.toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recurring */}
        {activeRecurring.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2
              className="text-lg font-medium text-white/90 mb-4"
              style={{ textShadow: "0 0 30px rgba(244, 114, 182, 0.15)" }}
            >
              Recurring
            </h2>
            <p
              className="font-mono text-4xl font-bold mb-2"
              style={{ color: "var(--dusk-accent)" }}
            >
              {formatCurrency(recurringTotal)}
            </p>
            <p className="text-sm" style={{ color: "var(--dusk-muted)" }}>
              {activeRecurring.length} active subscription
              {activeRecurring.length !== 1 ? "s" : ""}
            </p>
          </motion.div>
        )}

        {/* Top Insight */}
        {insights?.[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="pb-16 text-center"
          >
            <p
              className="text-sm leading-relaxed max-w-md mx-auto"
              style={{ color: "var(--dusk-muted)" }}
            >
              {insights[0].message}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
