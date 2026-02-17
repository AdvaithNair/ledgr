"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
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

function stagger(index: number) {
  return { delay: index * 0.05 };
}

function tileMotion(index: number, style: string) {
  const isPaper = style === "paper";
  return {
    initial: isPaper
      ? { opacity: 0, y: 12 }
      : { opacity: 0, y: 8, scale: 0.97 },
    animate: isPaper
      ? { opacity: 1, y: 0 }
      : { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: isPaper ? 0.5 : 0.4,
      ...stagger(index),
    },
  };
}

export function CommandDeck({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
  daily,
  merchants,
  cards,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const gradientId = useChartGradientId("cmd");
  const numericStyle = useNumericStyle();

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );
  const forgotten = recurring?.filter((r) => r.potentially_forgotten) ?? [];

  // Last 7 days
  const last7 = daily?.slice(-7) ?? [];
  const dailyAvg =
    last7.length > 0
      ? last7.reduce((s, d) => s + d.total, 0) / last7.length
      : 0;
  const peakDay = last7.reduce(
    (max, d) => (d.total > max.total ? d : max),
    last7[0] || { date: "", total: 0, count: 0 }
  );

  // Category data for horizontal bars
  const catData = summary.by_category.slice(0, 6).map((c) => ({
    name: c.category,
    value: c.total,
    color: CATEGORY_COLORS[c.category] || "#6B7280",
  }));

  // Anomaly counts
  const highCount = anomalies.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  ).length;
  const medCount = anomalies.filter((a) => a.severity === "elevated").length;

  let tileIdx = 0;

  return (
    <ThemedBackground>
      <div
        className="mx-auto max-w-7xl px-6 py-4"
        style={{ fontFamily: theme.bodyFont, lineHeight: theme.bodyLineHeight }}
      >
        {/* Row 1: Stats */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Hero */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">This Month</ThemedLabel>
              <p
                className="text-4xl font-bold"
                style={{ fontFamily: theme.displayFont, color: theme.text }}
              >
                {formatCurrency(summary.this_month)}
              </p>
              {forecast && (
                <p
                  className="mt-1 text-xs"
                  style={{ fontFamily: theme.bodyFont, color: theme.textMuted }}
                >
                  Proj. <span style={numericStyle}>{formatCurrency(forecast.projections.recommended)}</span>
                </p>
              )}
            </ThemedPanel>
          </motion.div>

          {/* This month stat */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">vs Last Month</ThemedLabel>
              <p
                className="text-2xl"
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
              <p
                className="mt-1 text-xs"
                style={{ ...numericStyle, color: theme.textMuted }}
              >
                Last: {formatCurrency(summary.last_month)}
              </p>
            </ThemedPanel>
          </motion.div>

          {/* vs Avg */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">vs Average</ThemedLabel>
              <p
                className="text-2xl"
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
              <p
                className="mt-1 text-xs"
                style={{ ...numericStyle, color: theme.textMuted }}
              >
                Avg: {formatCurrency(summary.avg_monthly)}
              </p>
            </ThemedPanel>
          </motion.div>

          {/* Anomaly alerts */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">Alerts</ThemedLabel>
              {anomalies.length > 0 ? (
                <div className="flex items-baseline gap-3">
                  {highCount > 0 && (
                    <span
                      className="text-2xl"
                      style={{ ...numericStyle, color: theme.danger }}
                    >
                      {highCount}
                      <span className="ml-1 text-xs" style={{ color: theme.danger }}>
                        high
                      </span>
                    </span>
                  )}
                  {medCount > 0 && (
                    <span
                      className="text-2xl"
                      style={{ ...numericStyle, color: theme.accent }}
                    >
                      {medCount}
                      <span className="ml-1 text-xs" style={{ color: theme.accent }}>
                        med
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <p
                  className="text-lg"
                  style={{ ...numericStyle, color: theme.success }}
                >
                  All clear
                </p>
              )}
            </ThemedPanel>
          </motion.div>
        </div>

        {/* Row 2: Charts */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Trend chart */}
          <motion.div className="lg:col-span-3" {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">Monthly Trend</ThemedLabel>
              {monthly && monthly.monthly.length > 0 && (
                <ResponsiveContainer width="100%" height={280}>
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
                    <CartesianGrid
                      stroke={theme.gridColor}
                      strokeDasharray="3 3"
                    />
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
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ThemedPanel>
          </motion.div>

          {/* Category breakdown */}
          <motion.div className="lg:col-span-2" {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">
                Category Breakdown
              </ThemedLabel>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={catData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: theme.axisColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: theme.axisColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v?: number) =>
                      v !== undefined ? [formatCurrency(v), "Total"] : []
                    }
                  />
                  <Bar dataKey="value" radius={theme.barRadius} animationDuration={800}>
                    {catData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ThemedPanel>
          </motion.div>
        </div>

        {/* Row 3: By Card, Top Merchants, Insights */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* By Card */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">By Card</ThemedLabel>
              <div className="space-y-3">
                {summary.by_card.slice(0, 4).map((c) => (
                  <div key={c.card} className="flex items-center gap-3">
                    <div
                      className="h-6 w-1 rounded-full"
                      style={{
                        backgroundColor: getCardColor(cards, c.card),
                      }}
                    />
                    <span
                      className="flex-1 text-sm"
                      style={{ fontFamily: theme.bodyFont, color: theme.text }}
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

          {/* Top Merchants */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">Top Merchants</ThemedLabel>
              <div className="space-y-3">
                {(merchants ?? []).slice(0, 4).map((m) => (
                  <div key={m.merchant} className="flex items-center justify-between">
                    <span
                      className="text-sm truncate"
                      style={{ fontFamily: theme.bodyFont, color: theme.text }}
                    >
                      {m.merchant}
                    </span>
                    <span
                      className="text-sm"
                      style={{ ...numericStyle, color: theme.text }}
                    >
                      {formatCurrency(m.total)}
                    </span>
                  </div>
                ))}
              </div>
            </ThemedPanel>
          </motion.div>

          {/* Smart Insights */}
          <motion.div {...tileMotion(tileIdx++, theme.style)}>
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">Insights</ThemedLabel>
              <div className="space-y-3">
                {(insights ?? []).slice(0, 3).map((ins, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span
                      className="mt-0.5 text-xs"
                      style={{
                        color:
                          ins.severity === "high"
                            ? theme.danger
                            : ins.severity === "medium"
                              ? theme.accent
                              : theme.success,
                      }}
                    >
                      {ins.icon}
                    </span>
                    <p
                      className="text-xs"
                      style={{
                        fontFamily: theme.bodyFont,
                        lineHeight: theme.bodyLineHeight,
                        color: theme.textMutedSmall,
                      }}
                    >
                      {ins.title}
                    </p>
                  </div>
                ))}
              </div>
            </ThemedPanel>
          </motion.div>
        </div>

        {/* Row 4: Recurring + Velocity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Recurring */}
          {activeRecurring.length > 0 && (
            <motion.div className="lg:col-span-3" {...tileMotion(tileIdx++, theme.style)}>
              <ThemedPanel hover style={{ padding: theme.panelPadding }}>
                <ThemedLabel className="mb-3 text-xs">
                  Subscriptions
                </ThemedLabel>
                <div className="mb-3 flex items-baseline gap-3">
                  <span
                    className="text-lg"
                    style={{ ...numericStyle, color: theme.text }}
                  >
                    {formatCurrency(recurringTotal)}/mo
                  </span>
                  <span
                    className="text-xs"
                    style={{ fontFamily: theme.bodyFont, color: theme.textMuted }}
                  >
                    {activeRecurring.length} active
                    {forgotten.length > 0 &&
                      ` \u00B7 ${forgotten.length} forgotten`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {activeRecurring.slice(0, 4).map((r) => (
                    <div
                      key={r.merchant}
                      className="rounded-lg p-2"
                      style={{
                        backgroundColor: theme.accentMuted,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <p
                        className="truncate text-xs"
                        style={{ fontFamily: theme.bodyFont, color: theme.text }}
                      >
                        {r.merchant}
                      </p>
                      <p
                        className="text-xs"
                        style={{ ...numericStyle, color: theme.textMuted }}
                      >
                        {formatCurrency(r.avg_amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </ThemedPanel>
            </motion.div>
          )}

          {/* 7-Day Velocity */}
          {last7.length > 0 && (
            <motion.div className="lg:col-span-2" {...tileMotion(tileIdx++, theme.style)}>
              <ThemedPanel hover style={{ padding: theme.panelPadding }}>
                <ThemedLabel className="mb-3 text-xs">
                  7-Day Velocity
                </ThemedLabel>
                <div className="mb-3 flex items-baseline gap-3">
                  <span
                    className="text-lg"
                    style={{ ...numericStyle, color: theme.text }}
                  >
                    {formatCurrency(dailyAvg)}/day
                  </span>
                  <span
                    className="text-xs"
                    style={{ fontFamily: theme.bodyFont, color: theme.textMuted }}
                  >
                    avg
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  {last7.map((d, i) => {
                    const maxVal = Math.max(...last7.map((x) => x.total));
                    const h = maxVal > 0 ? (d.total / maxVal) * 80 : 0;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: `${h}px`,
                            backgroundColor: theme.accent,
                            opacity: 0.6,
                          }}
                        />
                        <span
                          className="text-[9px]"
                          style={{ fontFamily: theme.bodyFont, color: theme.textMuted }}
                        >
                          {new Date(d.date).toLocaleDateString("en", {
                            weekday: "short",
                          }).slice(0, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {peakDay && (
                  <p
                    className="mt-2 text-xs"
                    style={{ fontFamily: theme.bodyFont, color: theme.textMuted }}
                  >
                    Peak: {formatCurrency(peakDay.total)} (
                    {new Date(peakDay.date).toLocaleDateString("en", {
                      weekday: "short",
                    })}
                    )
                  </p>
                )}
              </ThemedPanel>
            </motion.div>
          )}
        </div>
      </div>
    </ThemedBackground>
  );
}
