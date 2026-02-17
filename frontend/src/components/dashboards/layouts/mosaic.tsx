"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
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

function tileMotion(row: number, col: number, style: "arctic" | "paper") {
  const index = row * 3 + col;
  const isArctic = style === "arctic";
  return {
    initial: isArctic
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { opacity: 0, y: 12 },
    animate: isArctic
      ? { opacity: 1, scale: 1, y: 0 }
      : { opacity: 1, y: 0 },
    transition: {
      duration: isArctic ? 0.4 : 0.5,
      delay: index * 0.08,
    },
  };
}

export function Mosaic({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
  daily,
  cards,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const gradientId = useChartGradientId("mosaic");
  const numericStyle = useNumericStyle();

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );
  const forgotten = recurring?.filter((r) => r.potentially_forgotten) ?? [];

  // Daily rate
  const last7 = daily?.slice(-7) ?? [];
  const dailyAvg =
    last7.length > 0
      ? last7.reduce((s, d) => s + d.total, 0) / last7.length
      : summary.daily_rate;
  const peakDay = last7.reduce(
    (max, d) => (d.total > max.total ? d : max),
    last7[0] || { date: "", total: 0, count: 0 }
  );

  // Donut data
  const donutData = summary.by_category.slice(0, 8).map((c) => ({
    name: c.category,
    value: c.total,
    color: CATEGORY_COLORS[c.category] || "#6B7280",
  }));

  // Trajectory label
  const trajectoryLabel = forecast
    ? forecast.trajectory === "below_average"
      ? "Below avg"
      : forecast.trajectory === "near_average"
        ? "On track"
        : forecast.trajectory === "above_average"
          ? "Above avg"
          : "High"
    : null;

  const trajectoryPct = forecast
    ? Math.min(
        100,
        (forecast.current_month.days_elapsed /
          forecast.current_month.days_in_month) *
          100
      )
    : 0;

  const isPaper = theme.style === "paper";

  return (
    <ThemedBackground>
      <div
        className="mx-auto max-w-6xl px-6 py-4"
        style={{ fontFamily: theme.bodyFont, lineHeight: theme.bodyLineHeight }}
      >
        {/* 12-col grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(12, 1fr)",
          }}
        >
          {/* Row 1 */}
          {/* Hero stat — 6 cols */}
          <motion.div
            className="col-span-12 md:col-span-6"
            {...tileMotion(0, 0, theme.style)}
          >
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">
                This Month&apos;s Spending
              </ThemedLabel>
              <p
                className="text-5xl"
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: theme.headingWeight,
                  fontStyle: theme.headingItalic ? "italic" : "normal",
                  color: theme.text,
                }}
              >
                {formatCurrency(summary.this_month)}
              </p>
              {forecast && (
                <p
                  className="mt-2 text-sm"
                  style={{
                    fontFamily: theme.bodyFont,
                    color: theme.textMuted,
                    lineHeight: theme.bodyLineHeight,
                  }}
                >
                  Projected: <span style={numericStyle}>{formatCurrency(forecast.projections.recommended)}</span>
                </p>
              )}
            </ThemedPanel>
          </motion.div>

          {/* This month vs last — 2 cols */}
          <motion.div
            className="col-span-6 md:col-span-2"
            {...tileMotion(0, 1, theme.style)}
          >
            <ThemedPanel hover className="flex h-full flex-col justify-center" style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">vs Last</ThemedLabel>
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
            </ThemedPanel>
          </motion.div>

          {/* Trajectory — 4 cols */}
          <motion.div
            className="col-span-6 md:col-span-4"
            {...tileMotion(0, 2, theme.style)}
          >
            <ThemedPanel hover className="flex h-full flex-col justify-center" style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">Trajectory</ThemedLabel>
              <p
                className="text-lg"
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: theme.headingWeight,
                  fontStyle: theme.headingItalic ? "italic" : "normal",
                  color: theme.headingColor,
                }}
              >
                {trajectoryLabel}
              </p>
              {/* Progress bar */}
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: theme.accentMuted }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: theme.accent }}
                  initial={{ width: 0 }}
                  animate={{ width: `${trajectoryPct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
              <p
                className="mt-1 text-xs"
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textMuted,
                  lineHeight: theme.bodyLineHeight,
                }}
              >
                {trajectoryPct.toFixed(0)}% through month
              </p>
            </ThemedPanel>
          </motion.div>

          {/* Row 2 */}
          {/* Trend chart — 8 cols */}
          <motion.div
            className="col-span-12 lg:col-span-8"
            {...tileMotion(1, 0, theme.style)}
          >
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

          {/* Top Drivers — 4 cols */}
          <motion.div
            className="col-span-12 lg:col-span-4"
            {...tileMotion(1, 1, theme.style)}
          >
            <ThemedPanel hover className="h-full" style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">Top Drivers</ThemedLabel>
              <div className="space-y-4">
                {anomalies.slice(0, 3).map((a) => (
                  <div key={a.category}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[a.category] || "#6B7280",
                          }}
                        />
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.text,
                            lineHeight: theme.bodyLineHeight,
                          }}
                        >
                          {a.category}
                        </span>
                      </div>
                      <span
                        className="text-sm"
                        style={{ ...numericStyle, color: theme.text }}
                      >
                        {formatCurrency(a.current_month)}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 pl-4 text-xs"
                      style={{
                        fontFamily: theme.bodyFont,
                        color:
                          a.severity === "critical" || a.severity === "high"
                            ? theme.danger
                            : theme.accent,
                      }}
                    >
                      {a.pct_above_avg > 0 ? "\u25B2" : "\u25BC"}{" "}
                      {a.pct_above_avg.toFixed(0)}%
                    </p>
                  </div>
                ))}
                {anomalies.length === 0 && (
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.textMuted,
                      lineHeight: theme.bodyLineHeight,
                    }}
                  >
                    No anomalies detected
                  </p>
                )}
              </div>
            </ThemedPanel>
          </motion.div>

          {/* Row 3 */}
          {/* By Card — 2 cols */}
          <motion.div
            className="col-span-6 md:col-span-3 lg:col-span-2"
            {...tileMotion(2, 0, theme.style)}
          >
            <ThemedPanel hover className="h-full" style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">By Card</ThemedLabel>
              <div className="space-y-3">
                {summary.by_card.slice(0, 3).map((c) => (
                  <div key={c.card} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: getCardColor(cards, c.card),
                      }}
                    />
                    <span
                      className="flex-1 text-xs"
                      style={{
                        fontFamily: theme.bodyFont,
                        color: theme.text,
                        lineHeight: theme.bodyLineHeight,
                      }}
                    >
                      {c.card}
                    </span>
                    <span
                      className="text-xs"
                      style={{ ...numericStyle, color: theme.text }}
                    >
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </ThemedPanel>
          </motion.div>

          {/* Daily Rate — 2 cols */}
          <motion.div
            className="col-span-6 md:col-span-3 lg:col-span-2"
            {...tileMotion(2, 1, theme.style)}
          >
            <ThemedPanel hover className="flex h-full flex-col items-center justify-center text-center" style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-2 text-xs">Daily Rate</ThemedLabel>
              <p
                className="text-3xl"
                style={{ ...numericStyle, color: theme.text }}
              >
                {formatCurrency(dailyAvg)}
              </p>
              <p
                className="text-xs"
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textMuted,
                  lineHeight: theme.bodyLineHeight,
                }}
              >
                /day avg
              </p>
              {peakDay && peakDay.total > 0 && (
                <p
                  className="mt-2 text-xs"
                  style={{
                    fontFamily: theme.bodyFont,
                    color: theme.textMuted,
                    lineHeight: theme.bodyLineHeight,
                  }}
                >
                  Peak: <span style={numericStyle}>{formatCurrency(peakDay.total)}</span>
                </p>
              )}
            </ThemedPanel>
          </motion.div>

          {/* Category Donut — 8 cols */}
          <motion.div
            className="col-span-12 md:col-span-6 lg:col-span-8"
            {...tileMotion(2, 2, theme.style)}
          >
            <ThemedPanel hover style={{ padding: theme.panelPadding }}>
              <ThemedLabel className="mb-3 text-xs">
                Category Breakdown
              </ThemedLabel>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      animationDuration={800}
                    >
                      {donutData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.color}
                          fillOpacity={theme.mode === "light" ? 0.7 : 0.8}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v?: number) =>
                        v !== undefined ? [formatCurrency(v)] : []
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {donutData.slice(0, 6).map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span
                        className="flex-1 text-xs"
                        style={{
                          fontFamily: theme.bodyFont,
                          color: theme.text,
                          lineHeight: theme.bodyLineHeight,
                        }}
                      >
                        {d.name}
                      </span>
                      <span
                        className="text-xs"
                        style={{ ...numericStyle, color: theme.textMuted }}
                      >
                        {formatCurrency(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ThemedPanel>
          </motion.div>

          {/* Row 4 */}
          {/* Recurring — 8 cols */}
          {activeRecurring.length > 0 && (
            <motion.div
              className="col-span-12 lg:col-span-8"
              {...tileMotion(3, 0, theme.style)}
            >
              <ThemedPanel hover style={{ padding: theme.panelPadding }}>
                <ThemedLabel className="mb-3 text-xs">
                  Recurring / Subscriptions
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
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.textMuted,
                      lineHeight: theme.bodyLineHeight,
                    }}
                  >
                    · {activeRecurring.length} active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {activeRecurring.slice(0, 6).map((r) => (
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
                        style={{
                          fontFamily: theme.bodyFont,
                          color: theme.text,
                          lineHeight: theme.bodyLineHeight,
                        }}
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
                {forgotten.length > 0 && (
                  <p
                    className="mt-3 text-xs"
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.danger,
                      lineHeight: theme.bodyLineHeight,
                    }}
                  >
                    {"\u26A0"} {forgotten.length} possibly forgotten
                  </p>
                )}
              </ThemedPanel>
            </motion.div>
          )}

          {/* Top Insight — 4 cols */}
          {insights?.[0] && (
            <motion.div
              className="col-span-12 lg:col-span-4"
              {...tileMotion(3, 1, theme.style)}
            >
              <ThemedPanel hover className="flex h-full flex-col justify-center" style={{ padding: theme.panelPadding }}>
                <ThemedLabel className="mb-3 text-xs">Top Insight</ThemedLabel>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: theme.displayFont,
                    fontStyle: isPaper ? "italic" : "normal",
                    color: theme.text,
                    lineHeight: theme.bodyLineHeight,
                  }}
                >
                  &ldquo;{insights[0].message}&rdquo;
                </p>
                <p
                  className="mt-3 text-xs"
                  style={{
                    fontFamily: theme.bodyFont,
                    color:
                      insights[0].severity === "high"
                        ? theme.danger
                        : insights[0].severity === "medium"
                          ? theme.accent
                          : theme.textMuted,
                    lineHeight: theme.bodyLineHeight,
                  }}
                >
                  severity: {insights[0].severity.toUpperCase()}
                </p>
              </ThemedPanel>
            </motion.div>
          )}
        </div>
      </div>
    </ThemedBackground>
  );
}
