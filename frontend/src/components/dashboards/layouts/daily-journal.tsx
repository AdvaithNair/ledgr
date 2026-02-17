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
  ThemedDivider,
  useTooltipStyle,
  useChartGradientId,
  useNumericStyle,
} from "@/components/dashboards/themed-components";
import { formatCurrency } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { DashboardLayoutProps } from "./zen-flow";

function sectionReveal(delay = 0, style: "arctic" | "paper" = "arctic") {
  const isPaper = style === "paper";
  return {
    initial: { opacity: 0, y: 20, ...(isPaper ? {} : { scale: 0.98 }) },
    whileInView: { opacity: 1, y: 0, ...(isPaper ? {} : { scale: 1 }) },
    viewport: { once: true, margin: "-60px" as const },
    transition: { duration: isPaper ? 0.6 : 0.5, delay },
  };
}

function getHeadline(trajectory: string | undefined): string {
  switch (trajectory) {
    case "below_average":
      return "A steady month so far.";
    case "near_average":
      return "Right on track.";
    case "above_average":
      return "Spending is running a bit hot.";
    case "well_above_average":
      return "This month needs attention.";
    default:
      return "Here\u2019s your month at a glance.";
  }
}

export function DailyJournal({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
  habits,
  merchants,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const numericStyle = useNumericStyle();
  const gradientId = useChartGradientId("journal");

  const activeRecurring = recurring?.filter((r) => r.status === "active") ?? [];
  const recurringTotal = activeRecurring.reduce(
    (sum, r) => sum + r.avg_amount,
    0
  );

  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const headline = getHeadline(forecast?.trajectory);

  // Category comparison data
  const catCompare = summary.by_category.slice(0, 5).map((c) => ({
    name: c.category,
    current: c.total,
    color: CATEGORY_COLORS[c.category] || "#6B7280",
  }));

  // Find categories trending down (good news)
  const goodCategories =
    habits?.category_creep?.filter((c) => c.trend === "decreasing") ?? [];
  // Find categories trending up (watch)
  const watchCategories =
    forecast?.category_forecasts?.filter((c) => c.vs_avg_pct > 10) ?? [];

  // Top anomaly
  const topAnomaly = anomalies[0] ?? null;
  const topMerchants = merchants?.slice(0, 3) ?? [];

  // Style helpers
  const headingStyle = {
    fontFamily: theme.displayFont,
    fontWeight: theme.headingWeight,
    fontStyle: theme.headingItalic ? ("italic" as const) : ("normal" as const),
    color: theme.headingColor,
  };

  const bodyStyle = {
    fontFamily: theme.bodyFont,
    lineHeight: theme.bodyLineHeight,
    color: theme.text,
  };

  return (
    <ThemedBackground>
      <div
        className="mx-auto max-w-2xl"
        style={{
          fontFamily: theme.bodyFont,
          padding: theme.style === "paper" ? "0 24px" : "0 16px",
          fontSize: theme.style === "paper" ? "17px" : "16px",
          color: theme.text,
          lineHeight: theme.bodyLineHeight,
        }}
      >
        {/* Header */}
        <motion.div
          className="pb-8 pt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <p
            className="mb-2 text-sm uppercase tracking-widest"
            style={{
              color: theme.labelColor,
              fontFamily: theme.bodyFont,
            }}
          >
            {monthName}
          </p>
          <p
            className="text-3xl"
            style={{
              fontFamily: theme.displayFont,
              color: theme.text,
              fontStyle: theme.headingItalic ? "italic" : "normal",
            }}
          >
            &ldquo;{headline}&rdquo;
          </p>
        </motion.div>

        {/* Opening paragraph */}
        <motion.div className="pb-8" {...sectionReveal(0, theme.style)}>
          <p style={bodyStyle}>
            So far this month, you&apos;ve spent{" "}
            <span style={{ ...numericStyle, color: theme.accent }}>
              {formatCurrency(summary.this_month)}
            </span>{" "}
            across{" "}
            <span style={numericStyle}>{summary.transaction_count}</span>{" "}
            transactions.{" "}
            {summary.vs_avg_pct !== null && (
              <>
                That&apos;s{" "}
                <span style={numericStyle}>
                  {Math.abs(summary.vs_avg_pct).toFixed(0)}%
                </span>{" "}
                {summary.vs_avg_pct < 0 ? "below" : "above"} your typical
                pace
                {summary.vs_avg_pct < 0
                  ? " \u2014 you\u2019re doing well."
                  : "."}
              </>
            )}
          </p>
        </motion.div>

        {/* Trajectory chart */}
        {monthly && monthly.monthly.length > 0 && (
          <motion.div className="pb-8" {...sectionReveal(0.1, theme.style)}>
            <ResponsiveContainer width="100%" height={220}>
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
                  strokeWidth={theme.mode === "dark" ? 2 : 1.5}
                  fill={`url(#${gradientId})`}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
            {forecast && (
              <p
                className="mt-2 text-center text-sm"
                style={{
                  color: theme.textMuted,
                  fontFamily: theme.bodyFont,
                  lineHeight: theme.bodyLineHeight,
                }}
              >
                Projected{" "}
                <span style={numericStyle}>
                  {formatCurrency(forecast.projections.recommended)}
                </span>{" "}
                vs Average{" "}
                <span style={numericStyle}>
                  {formatCurrency(forecast.vs_average.avg_monthly)}
                </span>
              </p>
            )}
          </motion.div>
        )}

        {/* Divider */}
        <ThemedDivider className="my-12" />

        {/* Where it's going */}
        {topAnomaly && (
          <motion.div className="pb-8" {...sectionReveal(0, theme.style)}>
            <h2
              className="mb-6 text-xl"
              style={headingStyle}
            >
              Where it&apos;s going
            </h2>
            <p style={bodyStyle}>
              {topAnomaly.category} has spiked this month &mdash;{" "}
              <span style={numericStyle}>
                {formatCurrency(topAnomaly.current_month)}
              </span>
              , which is{" "}
              <span style={numericStyle}>
                {topAnomaly.pct_above_avg.toFixed(0)}%
              </span>{" "}
              above your typical spending.
              {topMerchants.length > 0 && " Your top spots:"}
            </p>

            {topMerchants.length > 0 && (
              <div className="mt-4 space-y-2">
                {topMerchants.map((m, i) => (
                  <motion.div
                    key={m.merchant}
                    className="flex items-center justify-between rounded-lg px-4 py-2"
                    style={{
                      backgroundColor: theme.accentMuted,
                      border: `1px solid ${theme.border}`,
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: theme.text, fontFamily: theme.bodyFont }}
                    >
                      {m.merchant}
                    </span>
                    <div className="flex gap-4">
                      <span
                        className="text-sm"
                        style={{ ...numericStyle, color: theme.textMuted }}
                      >
                        {m.count} visits
                      </span>
                      <span
                        className="text-sm"
                        style={{ ...numericStyle, color: theme.text }}
                      >
                        {formatCurrency(m.total)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Category comparison chart */}
            {catCompare.length > 0 && (
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={catCompare} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fill: theme.axisColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        `$${v}`
                      }
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
                        v !== undefined ? [formatCurrency(v), "This month"] : []
                      }
                    />
                    <Bar
                      dataKey="current"
                      radius={theme.barRadius}
                      animationDuration={800}
                    >
                      {catCompare.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        <ThemedDivider className="my-12" />

        {/* The good news */}
        {(goodCategories.length > 0 || activeRecurring.length > 0) && (
          <motion.div className="pb-8" {...sectionReveal(0, theme.style)}>
            <h2
              className="mb-6 text-xl"
              style={headingStyle}
            >
              The good news
            </h2>
            {goodCategories.length > 0 && (
              <p style={bodyStyle}>
                {goodCategories.map((c) => c.category).join(" and ")}{" "}
                {goodCategories.length === 1 ? "is" : "are"} down from last
                month.{" "}
              </p>
            )}
            {activeRecurring.length > 0 && (
              <p className="mt-2" style={bodyStyle}>
                Your subscriptions (
                <span style={numericStyle}>
                  {formatCurrency(recurringTotal)}/mo
                </span>
                ) are stable &mdash; no new charges detected this month.
              </p>
            )}
          </motion.div>
        )}

        <ThemedDivider className="my-12" />

        {/* Your patterns */}
        {habits && (
          <motion.div className="pb-8" {...sectionReveal(0, theme.style)}>
            <h2
              className="mb-6 text-xl"
              style={headingStyle}
            >
              Your patterns
            </h2>
            {habits.weekend_splurge.ratio > 1.2 && (
              <p style={bodyStyle}>
                You spend{" "}
                <span style={numericStyle}>
                  {((habits.weekend_splurge.ratio - 1) * 100).toFixed(0)}%
                </span>{" "}
                more on weekends than weekdays. Your busiest day averages{" "}
                <span style={numericStyle}>
                  {formatCurrency(habits.weekend_splurge.weekend_avg_daily)}
                </span>
                .
              </p>
            )}
            {habits.impulse_spending.score > 20 && (
              <p className="mt-2" style={bodyStyle}>
                {habits.impulse_spending.small_transaction_pct.toFixed(0)}% of
                transactions are under $15 &mdash; small purchases add up to{" "}
                <span style={numericStyle}>
                  {formatCurrency(habits.impulse_spending.monthly_small_total)}
                </span>{" "}
                this month.
              </p>
            )}
          </motion.div>
        )}

        <ThemedDivider className="my-12" />

        {/* Looking ahead */}
        {forecast && (
          <motion.div className="pb-8" {...sectionReveal(0, theme.style)}>
            <h2
              className="mb-6 text-xl"
              style={headingStyle}
            >
              Looking ahead
            </h2>
            <p style={bodyStyle}>
              At this pace, you&apos;ll finish {now.toLocaleDateString("en", { month: "long" })} at ~
              <span style={numericStyle}>
                {formatCurrency(forecast.projections.recommended)}
              </span>
              . That would be{" "}
              <span style={numericStyle}>
                {formatCurrency(
                  Math.abs(
                    forecast.projections.recommended -
                      forecast.vs_average.avg_monthly
                  )
                )}
              </span>{" "}
              {forecast.projections.recommended < forecast.vs_average.avg_monthly
                ? "below"
                : "above"}{" "}
              your 3-month average.
            </p>
            {watchCategories.length > 0 && (
              <div className="mt-4">
                <p
                  className="mb-2"
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.bodyFont,
                    lineHeight: theme.bodyLineHeight,
                  }}
                >
                  Categories to watch:
                </p>
                <ul className="space-y-1">
                  {watchCategories.slice(0, 3).map((c) => (
                    <li
                      key={c.category}
                      className="text-sm"
                      style={{
                        color: theme.text,
                        fontFamily: theme.bodyFont,
                        lineHeight: theme.bodyLineHeight,
                      }}
                    >
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[c.category] || "#6B7280",
                        }}
                      />
                      {c.category} &mdash; projected{" "}
                      <span style={numericStyle}>
                        {formatCurrency(c.projected)}
                      </span>{" "}
                      ({c.vs_avg_pct > 0 ? "+" : ""}
                      {c.vs_avg_pct.toFixed(0)}% vs avg)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Bottom spacer */}
        <div className="h-24" />
      </div>
    </ThemedBackground>
  );
}
