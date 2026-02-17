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

interface ZenMinimalistProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const customTooltipStyle = {
  backgroundColor: "#141419",
  border: "1px solid #1E1E26",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

export function ZenMinimalist({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
}: ZenMinimalistProps) {
  const monthlyTrend = monthly?.monthly ?? [];
  const vsAvgPct = summary.vs_avg_pct ?? 0;
  const projected = forecast?.projections.recommended ?? summary.projected_month_total;
  const vsAvgLabel = vsAvgPct > 0 ? "above" : "below";

  const topAnomalies = anomalies.slice(0, 3);
  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );
  const topInsight = insights?.[0];

  return (
    <div className="mx-auto max-w-3xl space-y-0">
      {/* Hero Section */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center py-16 text-center"
      >
        <p className="text-sm text-white/40">This Month</p>
        <motion.p
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mt-4 font-mono text-6xl font-bold text-white"
        >
          {formatCurrency(summary.this_month)}
        </motion.p>
        <div className="mt-4 space-y-1">
          <p className="text-sm text-white/50">
            {Math.abs(vsAvgPct).toFixed(0)}% {vsAvgLabel} your average
          </p>
          <p className="text-sm text-white/40">
            projected to finish at {formatCurrency(projected)}
          </p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="px-4 pb-16"
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="zenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#ffffff30" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={customTooltipStyle}
              formatter={(v?: number) => formatCurrency(v ?? 0)}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#ffffff60"
              strokeWidth={2}
              fill="url(#zenGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Scroll hint */}
      <div className="flex justify-center pb-12">
        <p className="text-xs text-white/20">─── scroll for details ───</p>
      </div>

      {/* What's driving this? */}
      {topAnomalies.length > 0 && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-12 text-center"
        >
          <h2 className="text-lg text-white/60">What&apos;s driving this?</h2>
          <div className="mt-6 space-y-3">
            {topAnomalies.map((a) => (
              <p key={a.category} className="text-white/50">
                <span className="font-medium text-white">{a.category}</span>:{" "}
                <span className="font-mono">
                  {formatCurrency(a.current_month)}
                </span>{" "}
                <span className="text-white/30">
                  (+{a.pct_above_avg.toFixed(0)}%)
                </span>
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recurring */}
      {activeRecurring.length > 0 && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-12 text-center"
        >
          <h2 className="text-lg text-white/60">Your recurring expenses</h2>
          <p className="mt-4 font-mono text-3xl font-semibold text-white">
            {formatCurrency(recurringTotal)} / month
          </p>
          <p className="mt-2 text-sm text-white/40">
            {activeRecurring.length} active subscriptions
          </p>
        </motion.div>
      )}

      {/* Top Insight */}
      {topInsight && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-12 text-center"
        >
          <p className="text-sm text-white/40">{topInsight.message}</p>
        </motion.div>
      )}

      <div className="h-16" />
    </div>
  );
}
