"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

interface ArcticGlassProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}

const glassPanel =
  "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl px-8 py-10";

export function ArcticGlass({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: ArcticGlassProps) {
  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  const momChange = summary.mom_change_pct;
  const vsAvg = summary.vs_avg_pct;

  return (
    <div
      className="relative max-w-3xl mx-auto"
      style={
        {
          "--arctic-accent": "#7DD3FC",
          "--arctic-bright": "#38BDF8",
          "--arctic-muted": "rgba(125, 211, 252, 0.35)",
          fontFamily: "var(--font-dm-sans)",
        } as React.CSSProperties
      }
    >
      {/* Background blobs for glassmorphism */}
      <div
        className="absolute top-20 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(125, 211, 252, 0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-[60%] right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-[40%] left-1/2 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(125, 211, 252, 0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Hero Section */}
      <motion.div
        className="py-16 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
      >
        <p
          className="text-sm tracking-widest uppercase mb-4"
          style={{ color: "var(--arctic-muted)" }}
        >
          This Month
        </p>
        <h1
          className="text-6xl font-bold text-white mb-4"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          {formatCurrency(summary.this_month)}
        </h1>
        <div
          className="space-y-1 text-sm"
          style={{ color: "var(--arctic-muted)" }}
        >
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
        <div className="h-48 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly.monthly}>
              <defs>
                <linearGradient id="arcticGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#7DD3FC" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tickFormatter={(v: string) => v.slice(5)}
                stroke="rgba(125, 211, 252, 0.2)"
                tick={{ fill: "rgba(125, 211, 252, 0.35)", fontSize: 12 }}
                axisLine={{ stroke: "rgba(125, 211, 252, 0.1)" }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(20, 20, 25, 0.8)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 13,
                }}
                formatter={(v?: number) =>
                  v !== undefined ? [formatCurrency(v), "Spent"] : []
                }
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#7DD3FC"
                strokeWidth={2}
                fill="url(#arcticGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="flex justify-center py-8">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--arctic-muted)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </motion.div>
      </div>

      {/* Glass Panel Sections */}
      <div className="py-12 space-y-6">
        {/* Top Drivers */}
        {anomalies.length > 0 && (
          <motion.div
            className={glassPanel}
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2
              className="text-sm tracking-widest uppercase mb-6"
              style={{ color: "var(--arctic-accent)" }}
            >
              What&apos;s driving this?
            </h2>
            <div className="space-y-5">
              {anomalies.slice(0, 3).map((a) => (
                <div
                  key={a.category}
                  className="flex items-center justify-between"
                >
                  <span className="text-white/70 text-sm">{a.category}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-white text-sm">
                      {formatCurrency(a.current_month)}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--arctic-muted)" }}
                    >
                      +{a.pct_above_avg.toFixed(0)}% above avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recurring */}
        {activeRecurring.length > 0 && (
          <motion.div
            className={glassPanel}
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2
              className="text-sm tracking-widest uppercase mb-6"
              style={{ color: "var(--arctic-accent)" }}
            >
              Recurring
            </h2>
            <p
              className="font-mono text-3xl text-white mb-1"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              {formatCurrency(recurringTotal)}
            </p>
            <p className="text-sm" style={{ color: "var(--arctic-muted)" }}>
              {activeRecurring.length} active subscription
              {activeRecurring.length !== 1 ? "s" : ""}
            </p>
          </motion.div>
        )}

        {/* Top Insight */}
        {insights?.[0] && (
          <motion.div
            className={glassPanel}
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2
              className="text-sm tracking-widest uppercase mb-6"
              style={{ color: "var(--arctic-accent)" }}
            >
              Insight
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              {insights[0].message}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
