"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getCardColor } from "@/lib/constants";
import { CATEGORY_COLORS } from "@/lib/constants";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  EnhancedMerchant,
  Card as CardType,
  ForecastData,
  Insight,
  CategoryAnomaly,
  RecurringTransaction,
  DailySpending,
} from "@/types";

interface CommandCenterProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  merchants: EnhancedMerchant[] | null;
  cards: CardType[];
  forecast: ForecastData | null;
  insights: Insight[] | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  daily: DailySpending[] | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function AnimatedNumber({ value }: { value: number }) {
  return <span>{formatCurrency(value)}</span>;
}

function severityColor(sev: string) {
  if (sev === "critical" || sev === "high") return "#EF4444";
  if (sev === "elevated" || sev === "medium") return "#F59E0B";
  return "#10B981";
}

const customTooltipStyle = {
  backgroundColor: "#141419",
  border: "1px solid #1E1E26",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

export function CommandCenter({
  summary,
  monthly,
  merchants,
  cards,
  forecast,
  insights,
  anomalies,
  recurring,
  daily,
}: CommandCenterProps) {
  const recentMonthly = monthly?.monthly?.slice(-6) ?? [];
  const topCategories = summary.by_category?.slice(0, 5) ?? [];
  const topMerchants = merchants?.slice(0, 3) ?? [];
  const topInsights = insights?.slice(0, 3) ?? [];
  const last7Days = daily?.slice(-7) ?? [];

  const anomalySeverityCounts = {
    high: anomalies.filter(
      (a) => a.severity === "high" || a.severity === "critical"
    ).length,
    medium: anomalies.filter((a) => a.severity === "elevated").length,
  };

  const recurringTotal =
    recurring?.reduce((sum, r) => sum + r.avg_amount, 0) ?? 0;
  const recurringCount = recurring?.filter((r) => r.status === "active").length ?? 0;

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "short" });
  const year = now.getFullYear();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header row */}
      <motion.div variants={item} className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">
            {monthName} {year}
          </span>
          <span className="font-mono text-lg font-semibold text-white">
            <AnimatedNumber value={summary.this_month} />
          </span>
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div
        variants={item}
        className="grid grid-cols-5 gap-3"
      >
        <Card padding="sm">
          <p className="text-[10px] uppercase text-white/40">Total</p>
          <p className="font-mono text-lg font-semibold">
            <AnimatedNumber value={summary.total_spent} />
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] uppercase text-white/40">This Month</p>
          <p className="font-mono text-lg font-semibold">
            <AnimatedNumber value={summary.this_month} />
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] uppercase text-white/40">Avg Monthly</p>
          <p className="font-mono text-lg font-semibold">
            <AnimatedNumber value={summary.avg_monthly} />
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] uppercase text-white/40">Projected</p>
          <p className="font-mono text-lg font-semibold">
            <AnimatedNumber
              value={forecast?.projections.recommended ?? summary.projected_month_total}
            />
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[10px] uppercase text-white/40">Anomalies</p>
          <div className="mt-1 flex gap-2">
            {anomalySeverityCounts.high > 0 && (
              <Badge color="#EF4444">
                {anomalySeverityCounts.high} High
              </Badge>
            )}
            {anomalySeverityCounts.medium > 0 && (
              <Badge color="#F59E0B">
                {anomalySeverityCounts.medium} Med
              </Badge>
            )}
            {anomalySeverityCounts.high === 0 && anomalySeverityCounts.medium === 0 && (
              <Badge color="#10B981">Clear</Badge>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {/* Monthly Trend Sparkline */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">
            Monthly Trend (6mo)
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={recentMonthly}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "#ffffff40" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v?: number) => formatCurrency(v ?? 0)}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#ffffff"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Breakdown */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">
            Category Breakdown (This Month)
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={topCategories} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 10, fill: "#ffffff60" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v?: number) => formatCurrency(v ?? 0)}
              />
              <Bar
                dataKey="total"
                radius={[0, 4, 4, 0]}
                isAnimationActive
                fill="#ffffff20"
              >
                {topCategories.map((cat) => (
                  <rect
                    key={cat.category}
                    fill={CATEGORY_COLORS[cat.category] ?? "#6B7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Detail row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        {/* By Card */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">By Card</p>
          <div className="space-y-2">
            {summary.by_card?.map((c) => (
              <div key={c.card} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-1 rounded-full"
                    style={{
                      backgroundColor: getCardColor(cards, c.card),
                    }}
                  />
                  <span className="text-xs text-white/60">{c.card}</span>
                </div>
                <span className="font-mono text-xs">
                  {formatCurrency(c.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Merchants */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">
            Top Merchants
          </p>
          <div className="space-y-2">
            {topMerchants.map((m) => (
              <div key={m.merchant} className="flex items-center justify-between">
                <span className="truncate text-xs text-white/60">
                  {m.merchant}
                </span>
                <span className="ml-2 font-mono text-xs">
                  {formatCurrency(m.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Rate Heatmap */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">
            Daily Rate (7-day)
          </p>
          <div className="flex gap-1">
            {last7Days.map((d) => {
              const max = Math.max(...last7Days.map((x) => x.total), 1);
              const intensity = d.total / max;
              const bg =
                intensity < 0.33
                  ? "#10B981"
                  : intensity < 0.66
                    ? "#F59E0B"
                    : "#EF4444";
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="h-8 w-full rounded"
                    style={{ backgroundColor: bg, opacity: 0.3 + intensity * 0.7 }}
                    title={`${d.date}: ${formatCurrency(d.total)}`}
                  />
                  <span className="text-[8px] text-white/30">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("en", {
                      weekday: "narrow",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Bottom row */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        {/* Recurring */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-white/40">Recurring</p>
            <span className="font-mono text-sm">
              {formatCurrency(recurringTotal)}/mo
            </span>
          </div>
          <p className="mt-1 text-xs text-white/40">
            {recurringCount} active subscriptions
          </p>
          <div className="mt-2 space-y-1">
            {recurring
              ?.filter((r) => r.status === "active")
              .slice(0, 4)
              .map((r) => (
                <div
                  key={r.merchant}
                  className="flex items-center justify-between"
                >
                  <span className="truncate text-xs text-white/50">
                    {r.merchant}
                  </span>
                  <span className="ml-2 font-mono text-xs text-white/60">
                    {formatCurrency(r.avg_amount)}
                  </span>
                </div>
              ))}
          </div>
        </Card>

        {/* Insights */}
        <Card padding="sm">
          <p className="mb-2 text-[10px] uppercase text-white/40">
            Insights (Top 3)
          </p>
          <div className="space-y-2">
            {topInsights.map((insight, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span
                  className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: severityColor(insight.severity) }}
                />
                <span className="text-white/60">{insight.message}</span>
              </div>
            ))}
            {topInsights.length === 0 && (
              <p className="text-xs text-white/30">No insights yet</p>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
