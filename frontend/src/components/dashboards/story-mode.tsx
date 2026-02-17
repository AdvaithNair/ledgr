"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type {
  EnhancedSummaryStats,
  ForecastData,
  CategoryAnomaly,
  EnhancedMerchant,
  HabitAnalysis,
  RecurringTransaction,
} from "@/types";

interface StoryModeProps {
  summary: EnhancedSummaryStats;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  merchants: EnhancedMerchant[] | null;
  habits: HabitAnalysis | null;
  recurring: RecurringTransaction[] | null;
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

function getHeadline(
  trajectory: string | undefined
): { headline: string; tone: string } {
  switch (trajectory) {
    case "below_average":
      return {
        headline: "You're on track for a strong month.",
        tone: "positive",
      };
    case "near_average":
      return { headline: "A steady month so far.", tone: "neutral" };
    case "above_average":
      return {
        headline: "Spending is running a bit hot this month.",
        tone: "caution",
      };
    case "well_above_average":
      return {
        headline: "This month needs some attention.",
        tone: "warning",
      };
    default:
      return { headline: "Here's your monthly story.", tone: "neutral" };
  }
}

export function StoryMode({
  summary,
  forecast,
  anomalies,
  merchants,
  habits,
  recurring,
}: StoryModeProps) {
  const { headline } = getHeadline(forecast?.trajectory);

  const projected = forecast?.projections.recommended ?? summary.projected_month_total;
  const avgMonthly = forecast?.vs_average?.avg_monthly ?? summary.avg_monthly;
  const vsAvgPct = summary.vs_avg_pct ?? 0;
  const paceLabel = vsAvgPct <= 0 ? "below" : "above";

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });

  const topAnomaly = anomalies[0];

  // Build trajectory chart data
  const daysInMonth = forecast?.current_month?.days_in_month ?? 30;
  const daysElapsed = forecast?.current_month?.days_elapsed ?? 15;
  const trajectoryData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      projected: (projected / daysInMonth) * day,
      average: (avgMonthly / daysInMonth) * day,
      actual: day <= daysElapsed ? (summary.this_month / daysElapsed) * day : undefined,
    };
  });

  const weekendSplurge = habits?.weekend_splurge;
  const goodCategories =
    habits?.category_creep?.filter((c) => c.trend === "decreasing") ?? [];

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  return (
    <div className="mx-auto max-w-2xl space-y-0 pb-16">
      {/* Opening */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.8 }}
        className="py-12"
      >
        <h1 className="text-2xl font-semibold text-white">
          Your {monthName} Story
        </h1>
        <p className="mt-6 text-lg italic text-white/60">
          &ldquo;{headline}&rdquo;
        </p>
        <p className="mt-4 leading-relaxed text-white/50">
          So far this month, you&apos;ve spent{" "}
          <span className="font-mono text-white">
            {formatCurrency(summary.this_month)}
          </span>{" "}
          across {summary.transaction_count} transactions. That&apos;s{" "}
          {Math.abs(vsAvgPct).toFixed(0)}% {paceLabel} your typical pace
          {vsAvgPct <= 0 ? " — nice work!" : "."} At this rate, you&apos;ll
          finish around{" "}
          <span className="font-mono text-white">
            {formatCurrency(projected)}
          </span>
          {projected < avgMonthly
            ? ", well under your 3-month average."
            : projected > avgMonthly * 1.1
              ? ", above your 3-month average."
              : ", close to your 3-month average."}
        </p>
      </motion.div>

      {/* Trajectory Chart */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="py-8"
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trajectoryData}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#ffffff30" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={customTooltipStyle}
              formatter={(v?: number) => formatCurrency(v ?? 0)}
            />
            <ReferenceLine
              y={avgMonthly}
              stroke="#ffffff20"
              strokeDasharray="3 3"
              label={{
                value: `Avg ${formatCurrency(avgMonthly)}`,
                position: "right",
                fill: "#ffffff30",
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#ffffff20"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#ffffff40"
              strokeDasharray="3 3"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              dot={false}
              strokeWidth={2}
              animationDuration={1500}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Anomaly paragraph */}
      {topAnomaly && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-8"
        >
          <p className="leading-relaxed text-white/50">
            However, <span className="font-medium text-white">{topAnomaly.category}</span>{" "}
            has spiked — you&apos;ve spent{" "}
            <span className="font-mono text-white">
              {formatCurrency(topAnomaly.current_month)}
            </span>{" "}
            this month, {topAnomaly.pct_above_avg.toFixed(0)}% above normal.
            {merchants && merchants.length > 0 && (
              <> Here are your top spots:</>
            )}
          </p>
          {merchants && merchants.length > 0 && (
            <ul className="mt-4 space-y-1">
              {merchants.slice(0, 3).map((m, i) => (
                <motion.li
                  key={m.merchant}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-white/50"
                >
                  <span className="font-medium text-white/70">
                    {m.merchant}
                  </span>{" "}
                  — {m.count} visits,{" "}
                  <span className="font-mono">
                    {formatCurrency(m.total)}
                  </span>{" "}
                  total
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      )}

      {/* Weekend insight */}
      {weekendSplurge && weekendSplurge.ratio > 1.3 && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-4"
        >
          <p className="leading-relaxed text-white/50">
            Your weekend spending is running{" "}
            {((weekendSplurge.ratio - 1) * 100).toFixed(0)}% higher than
            weekdays. Consider setting a weekend budget to keep this in check.
          </p>
        </motion.div>
      )}

      {/* Divider */}
      <div className="py-8">
        <hr className="border-border" />
      </div>

      {/* Good News */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="py-4"
      >
        <h2 className="text-lg font-medium text-white">The Good News</h2>
        <div className="mt-4 space-y-3">
          {goodCategories.length > 0 ? (
            goodCategories.map((cat) => (
              <p key={cat.category} className="leading-relaxed text-white/50">
                <span className="font-medium text-white/70">
                  {cat.category}
                </span>{" "}
                is down {Math.abs(cat.three_month_change_pct).toFixed(0)}% from
                last month.
              </p>
            ))
          ) : (
            <p className="text-white/40">
              Keep going — positive trends will show up here.
            </p>
          )}

          {activeRecurring.length > 0 && (
            <p className="leading-relaxed text-white/50">
              Your recurring subscriptions (
              <span className="font-mono">
                {formatCurrency(recurringTotal)}/mo
              </span>
              ) are stable with no new charges detected.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
