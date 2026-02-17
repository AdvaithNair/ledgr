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
import { CATEGORY_COLORS, getCardColor } from "@/lib/constants";
import type { DashboardLayoutProps } from "./zen-flow";

function cardMotion(index: number) {
  return {
    initial: { opacity: 0, y: 16 } as const,
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: "-40px" as const },
    transition: { duration: 0.4, delay: index * 0.1 },
  };
}

export function Pulse({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
  cards,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const numericStyle = useNumericStyle();
  const gradientId = useChartGradientId("pulse");

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );
  const forgotten = recurring?.filter((r) => r.potentially_forgotten) ?? [];

  const topAnomaly = anomalies[0] ?? null;

  let cardIdx = 0;

  return (
    <ThemedBackground>
      <div
        className="mx-auto max-w-4xl px-6 py-4"
        style={{ fontFamily: theme.bodyFont }}
      >
        <div className="space-y-4">
          {/* Hero Card — Spending Pulse */}
          <motion.div {...cardMotion(cardIdx++)}>
            <ThemedPanel className="p-8">
              <ThemedLabel className="mb-4 text-xs">SPENDING PULSE</ThemedLabel>
              <p
                className="text-center text-5xl font-bold"
                style={{ fontFamily: theme.displayFont, color: theme.text }}
              >
                {formatCurrency(summary.this_month)}
              </p>
              <p
                className="mt-1 text-center text-sm"
                style={{ color: theme.textMuted }}
              >
                this month
              </p>

              {/* Mini stat pills */}
              <div className="mt-6 flex justify-center gap-3">
                {/* vs last month */}
                <motion.div
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: theme.accentMuted,
                    border: `1px solid ${theme.border}`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-center text-xs" style={{ color: theme.textMuted }}>
                    vs last
                  </p>
                  <p
                    className="text-center text-sm"
                    style={{
                      ...numericStyle,
                      color:
                        (summary.mom_change_pct ?? 0) > 0
                          ? theme.danger
                          : theme.success,
                    }}
                  >
                    {summary.mom_change_pct !== null
                      ? `${summary.mom_change_pct >= 0 ? "+" : ""}${summary.mom_change_pct.toFixed(1)}%`
                      : "\u2014"}
                  </p>
                </motion.div>

                {/* vs avg */}
                <motion.div
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: theme.accentMuted,
                    border: `1px solid ${theme.border}`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-center text-xs" style={{ color: theme.textMuted }}>
                    vs avg
                  </p>
                  <p
                    className="text-center text-sm"
                    style={{
                      ...numericStyle,
                      color:
                        (summary.vs_avg_pct ?? 0) > 0
                          ? theme.danger
                          : theme.success,
                    }}
                  >
                    {summary.vs_avg_pct !== null
                      ? `${summary.vs_avg_pct >= 0 ? "+" : ""}${summary.vs_avg_pct.toFixed(1)}%`
                      : "\u2014"}
                  </p>
                </motion.div>

                {/* projected */}
                {forecast && (
                  <motion.div
                    className="rounded-full px-4 py-2"
                    style={{
                      backgroundColor: theme.accentMuted,
                      border: `1px solid ${theme.border}`,
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p
                      className="text-center text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      projected
                    </p>
                    <p
                      className="text-center text-sm"
                      style={{ ...numericStyle, color: theme.text }}
                    >
                      {formatCurrency(forecast.projections.recommended)}
                    </p>
                  </motion.div>
                )}
              </div>
            </ThemedPanel>
          </motion.div>

          {/* Trend Card */}
          {monthly && monthly.monthly.length > 0 && (
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="p-6">
                <ThemedLabel className="mb-4 text-xs">TREND</ThemedLabel>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthly.monthly}>
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={theme.chartStroke}
                          stopOpacity={theme.mode === "dark" ? 0.2 : 0.08}
                        />
                        <stop
                          offset="100%"
                          stopColor={theme.chartStroke}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    {theme.mode === "light" && (
                      <CartesianGrid
                        stroke={theme.gridColor}
                        strokeDasharray="3 3"
                      />
                    )}
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v: string) => v.slice(5)}
                      tick={{ fill: theme.axisColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: theme.axisColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        `$${(v / 1000).toFixed(1)}k`
                      }
                    />
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
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ThemedPanel>
            </motion.div>
          )}

          {/* Split Cards: Categories + Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Categories */}
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="p-6 h-full">
                <ThemedLabel className="mb-4 text-xs">CATEGORIES</ThemedLabel>
                <div className="space-y-3">
                  {summary.by_category.slice(0, 5).map((c) => {
                    const catForecast = forecast?.category_forecasts?.find(
                      (f) => f.category === c.category
                    );
                    return (
                      <div
                        key={c.category}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[c.category] || "#6B7280",
                          }}
                        />
                        <span
                          className="flex-1 text-sm"
                          style={{ color: theme.text }}
                        >
                          {c.category}
                        </span>
                        <span
                          className="text-sm"
                          style={{ ...numericStyle, color: theme.text }}
                        >
                          {formatCurrency(c.total)}
                        </span>
                        {catForecast && (
                          <span
                            className="text-xs"
                            style={{
                              color:
                                catForecast.trend === "up"
                                  ? theme.danger
                                  : catForecast.trend === "down"
                                    ? theme.success
                                    : theme.textMuted,
                            }}
                          >
                            {catForecast.trend === "up"
                              ? "\u25B2"
                              : catForecast.trend === "down"
                                ? "\u25BC"
                                : "\u2500"}
                            {Math.abs(catForecast.vs_avg_pct).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ThemedPanel>
            </motion.div>

            {/* Cards */}
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="p-6 h-full">
                <ThemedLabel className="mb-4 text-xs">CARDS</ThemedLabel>
                <div className="space-y-3">
                  {summary.by_card.map((c) => (
                    <div key={c.card} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: getCardColor(cards, c.card),
                        }}
                      />
                      <span
                        className="flex-1 text-sm"
                        style={{ color: theme.text }}
                      >
                        {c.card}
                      </span>
                      <span
                        className="text-sm"
                        style={{ ...numericStyle, color: theme.text }}
                      >
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </ThemedPanel>
            </motion.div>
          </div>

          {/* Alert Card */}
          {topAnomaly && (
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="overflow-hidden p-0">
                <div className="flex">
                  <div
                    className="w-1"
                    style={{
                      backgroundColor:
                        topAnomaly.severity === "critical"
                          ? theme.danger
                          : theme.accent,
                    }}
                  />
                  <div className="flex-1 p-6">
                    <ThemedLabel className="mb-3 text-xs">ALERT</ThemedLabel>
                    <p className="text-sm" style={{ color: theme.text }}>
                      {"\u26A0"} {topAnomaly.message}
                    </p>
                    <p
                      className="mt-2 text-xs"
                      style={{ ...numericStyle, color: theme.textMuted }}
                    >
                      {formatCurrency(topAnomaly.current_month)} spent vs{" "}
                      {formatCurrency(topAnomaly.avg_monthly)} typical ·
                      severity:{" "}
                      {topAnomaly.severity.toUpperCase()}
                    </p>
                  </div>
                </div>
              </ThemedPanel>
            </motion.div>
          )}

          {/* Subscriptions Card */}
          {activeRecurring.length > 0 && (
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="p-6">
                <ThemedLabel className="mb-4 text-xs">
                  SUBSCRIPTIONS
                </ThemedLabel>
                <div className="mb-3 flex items-baseline gap-2">
                  <span
                    className="text-lg"
                    style={{ ...numericStyle, color: theme.text }}
                  >
                    {formatCurrency(recurringTotal)}/mo
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    · {activeRecurring.length} active · {formatCurrency(recurringTotal * 12)}/yr
                  </span>
                </div>
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  {activeRecurring
                    .slice(0, 3)
                    .map(
                      (r) =>
                        `${r.merchant} ${formatCurrency(r.avg_amount)}`
                    )
                    .join("  ·  ")}
                  {activeRecurring.length > 3 &&
                    `  ·  +${activeRecurring.length - 3} more`}
                </p>
                {forgotten.length > 0 && (
                  <p
                    className="mt-3 text-xs"
                    style={{ color: theme.danger }}
                  >
                    {"\u26A0"} {forgotten.length} potentially forgotten
                    subscription{forgotten.length > 1 ? "s" : ""}
                  </p>
                )}
              </ThemedPanel>
            </motion.div>
          )}

          {/* Insight Card */}
          {insights?.[0] && (
            <motion.div {...cardMotion(cardIdx++)}>
              <ThemedPanel className="p-8">
                <ThemedLabel className="mb-4 text-xs">INSIGHT</ThemedLabel>
                <p
                  className="text-lg leading-relaxed"
                  style={{
                    fontFamily: theme.displayFont,
                    color: theme.text,
                  }}
                >
                  &ldquo;{insights[0].message}&rdquo;
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
