"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import {
  ThemedBackground,
  ThemedPanel,
  ThemedLabel,
  ThemedDivider,
  useTooltipStyle,
  useChartGradientId,
} from "@/components/dashboards/themed-components";
import { formatCurrency } from "@/lib/utils";
import { getCardColor, getCardLabel, CATEGORY_COLORS } from "@/lib/constants";
import type { DashboardLayoutProps } from "./zen-flow";

// ── Animated count-up hook ──
function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Overdamped spring — fast rise, gentle settle
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target); // snap to exact
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── Rolling average calculation ──
function computeRollingAvg(
  data: { month: string; total: number }[],
  window = 3
) {
  return data.map((item, i) => {
    if (i < window - 1) return { ...item, rollingAvg: undefined };
    const slice = data.slice(i - window + 1, i + 1);
    const avg = slice.reduce((s, d) => s + d.total, 0) / window;
    return { ...item, rollingAvg: avg };
  });
}

function getCurrentMonthLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Animated proportion bar ──
function ProportionBar({
  width,
  color,
  delay = 0,
}: {
  width: number;
  color: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div
      ref={ref}
      className="mt-1.5 h-[3px] overflow-hidden rounded-full"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, opacity: 0.7 }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${width}%` } : { width: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const }}
      />
    </div>
  );
}

export function Meridian({
  summary,
  monthly,
  forecast,
  anomalies,
  recurring,
  insights,
  merchants,
  cards,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const gradientId = useChartGradientId("meridian");

  const heroAmount = useCountUp(summary.this_month);
  const isPaper = theme.style === "paper";

  // Chart data with rolling average
  const chartData = useMemo(() => {
    if (!monthly?.monthly) return [];
    return computeRollingAvg(monthly.monthly);
  }, [monthly]);

  // Top categories sorted by amount
  const topCategories = useMemo(() => {
    return [...summary.by_category]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [summary.by_category]);

  const maxCategoryTotal = topCategories[0]?.total ?? 1;

  // Cards sorted by total
  const sortedCards = useMemo(() => {
    return [...summary.by_card].sort((a, b) => b.total - a.total);
  }, [summary.by_card]);

  const maxCardTotal = sortedCards[0]?.total ?? 1;

  // Top merchants — lead merchant treated differently
  const topMerchants = useMemo(() => {
    if (!merchants) return [];
    return [...merchants].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [merchants]);

  // Highest severity anomaly for alert
  const topAnomaly = useMemo(() => {
    if (!anomalies.length) return null;
    const severityOrder = { critical: 3, high: 2, elevated: 1 };
    return [...anomalies].sort(
      (a, b) =>
        (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
    )[0];
  }, [anomalies]);

  // Category forecast lookup for alert
  const categoryForecasts = useMemo(() => {
    if (!forecast?.category_forecasts) return new Map<string, number>();
    return new Map(
      forecast.category_forecasts.map((cf) => [cf.category, cf.projected])
    );
  }, [forecast]);

  // Category trend lookup
  const categoryTrends = useMemo(() => {
    const map = new Map<
      string,
      { direction: "up" | "down" | "flat"; pct: number }
    >();
    for (const a of anomalies) {
      map.set(a.category, {
        direction: "up",
        pct: Math.round(a.pct_above_avg),
      });
    }
    if (forecast?.category_forecasts) {
      for (const cf of forecast.category_forecasts) {
        if (!map.has(cf.category)) {
          if (cf.vs_avg_pct > 10) {
            map.set(cf.category, {
              direction: "up",
              pct: Math.round(cf.vs_avg_pct),
            });
          } else if (cf.vs_avg_pct < -10) {
            map.set(cf.category, {
              direction: "down",
              pct: Math.round(Math.abs(cf.vs_avg_pct)),
            });
          } else {
            map.set(cf.category, { direction: "flat", pct: 0 });
          }
        }
      }
    }
    return map;
  }, [anomalies, forecast]);

  // Recurring
  const activeRecurring = useMemo(() => {
    if (!recurring) return [];
    return recurring.filter((r) => r.status === "active");
  }, [recurring]);

  const forgottenRecurring = useMemo(() => {
    if (!recurring) return [];
    return recurring.filter((r) => r.potentially_forgotten);
  }, [recurring]);

  const recurringTotal = useMemo(() => {
    return activeRecurring.reduce((s, r) => s + r.avg_amount, 0);
  }, [activeRecurring]);

  // Top insight
  const topInsight = useMemo(() => {
    if (!insights?.length) return null;
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return [...insights].sort(
      (a, b) =>
        (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
    )[0];
  }, [insights]);

  // ── Helpers ──
  function sentimentColor(value: number | null | undefined) {
    if (value == null) return theme.textMuted;
    return value > 0 ? theme.danger : theme.success;
  }

  function trendArrow(dir: "up" | "down" | "flat") {
    if (dir === "up") return "▲";
    if (dir === "down") return "▼";
    return "─";
  }

  function alertBorderColor(severity: string) {
    if (severity === "critical" || severity === "high") return theme.danger;
    if (severity === "elevated") return theme.accent;
    return theme.textMuted;
  }

  // Staggered scroll reveal
  const sectionReveal = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" as const },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <ThemedBackground>
      <div className="mx-auto max-w-4xl px-6 pb-32">
        {/* ════════════════════════════════════════════════════════
            HERO — The one number that matters
            ════════════════════════════════════════════════════════ */}
        <div className="relative pb-6 pt-24 text-center">
          {/* Radial glow behind hero number */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-64 w-64 rounded-full md:h-80 md:w-80"
              style={{
                background: `radial-gradient(circle, ${theme.accentMuted} 0%, transparent 70%)`,
                filter: "blur(60px)",
              }}
            />
          </div>

          {/* Month label */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-6 text-[11px] uppercase tracking-[0.25em]"
            style={{ color: theme.textMuted, fontFamily: theme.bodyFont }}
          >
            {getCurrentMonthLabel()}
          </motion.p>

          {/* Hero number */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 14,
              delay: 0.1,
            }}
            className="relative"
          >
            <p
              className="text-[3.5rem] font-bold leading-none tracking-tight md:text-[4.5rem]"
              style={{ fontFamily: theme.displayFont, color: theme.text }}
            >
              {formatCurrency(heroAmount)}
            </p>
          </motion.div>

          {/* ── Context gauge: three connected segments ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="relative mt-10 inline-flex items-stretch overflow-hidden rounded-full"
            style={{
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              border: `1px solid ${theme.mode === "dark" ? "rgba(255,255,255,0.06)" : theme.border}`,
            }}
          >
            {/* Pill: vs last */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="flex flex-col items-center px-5 py-2.5"
            >
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{
                  color: theme.textMuted,
                  fontFamily: theme.bodyFont,
                }}
              >
                vs last
              </span>
              <span
                className="mt-0.5 font-mono text-[13px] font-medium"
                style={{ color: sentimentColor(summary.mom_change_pct) }}
              >
                {summary.mom_change_pct != null
                  ? `${summary.mom_change_pct > 0 ? "+" : ""}${Math.round(summary.mom_change_pct)}%`
                  : "─"}
              </span>
            </motion.div>

            {/* Divider */}
            <div
              className="my-2 w-px"
              style={{
                backgroundColor:
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
              }}
            />

            {/* Pill: vs avg */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.5 }}
              className="flex flex-col items-center px-5 py-2.5"
            >
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{
                  color: theme.textMuted,
                  fontFamily: theme.bodyFont,
                }}
              >
                vs avg
              </span>
              <span
                className="mt-0.5 font-mono text-[13px] font-medium"
                style={{ color: sentimentColor(summary.vs_avg_pct) }}
              >
                {summary.vs_avg_pct != null
                  ? `${summary.vs_avg_pct > 0 ? "+" : ""}${Math.round(summary.vs_avg_pct)}%`
                  : "─"}
              </span>
            </motion.div>

            {/* Divider */}
            <div
              className="my-2 w-px"
              style={{
                backgroundColor:
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
              }}
            />

            {/* Pill: on pace */}
            {forecast && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.6 }}
                className="flex flex-col items-center px-5 py-2.5"
              >
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.bodyFont,
                  }}
                >
                  on pace
                </span>
                <span
                  className="mt-0.5 font-mono text-[13px] font-medium"
                  style={{
                    color:
                      forecast.vs_average.projected_change_pct > 0
                        ? theme.danger
                        : theme.success,
                  }}
                >
                  {formatCurrency(forecast.projections.recommended)}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Scroll indicator — three dots pulsing in sequence */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-16 flex items-center justify-center gap-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
                className="h-[3px] w-[3px] rounded-full"
                style={{
                  backgroundColor: theme.accent,
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════
            TREND CHART — 12-month trajectory
            ════════════════════════════════════════════════════════ */}
        {chartData.length > 0 && (
          <motion.div {...sectionReveal()} className="mt-4">
            <ThemedPanel className="overflow-hidden p-0">
              {/* Chart bleeds to panel edges — no inner padding on chart itself */}
              <div className="px-4 pt-5 pb-0 md:px-6">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                  >
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
                          stopColor={theme.chartGradientStart}
                          stopOpacity={1}
                        />
                        <stop
                          offset="100%"
                          stopColor={theme.chartGradientEnd}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 6"
                      stroke={theme.gridColor}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v: string) => {
                        const [, m] = v.split("-");
                        const date = new Date(2000, Number(m) - 1);
                        return date
                          .toLocaleDateString("en-US", { month: "short" })
                          .slice(0, 3);
                      }}
                      tick={{ fontSize: 10, fill: theme.axisColor }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        v >= 1000
                          ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
                          : `$${v}`
                      }
                      tick={{ fontSize: 10, fill: theme.axisColor }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v?: number) =>
                        v != null
                          ? [formatCurrency(v), "Total"]
                          : ["—", "Total"]
                      }
                      labelFormatter={(label) => {
                        const str = String(label);
                        const [y, m] = str.split("-");
                        const date = new Date(Number(y), Number(m) - 1);
                        return date.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        });
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={theme.chartStroke}
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      animationDuration={1200}
                    />
                    <Line
                      type="monotone"
                      dataKey="rollingAvg"
                      stroke={theme.textMuted}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                      animationDuration={1200}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {/* Bottom edge bar — daily rate micro-stat */}
              <div
                className="flex items-center justify-between px-5 py-3 md:px-6"
                style={{
                  borderTop: `1px solid ${theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.bodyFont,
                  }}
                >
                  Daily rate
                </span>
                <span
                  className="font-mono text-xs"
                  style={{ color: theme.text }}
                >
                  {formatCurrency(summary.daily_rate)}/day
                </span>
              </div>
            </ThemedPanel>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            CATEGORIES + CARDS — side by side breakdown
            ════════════════════════════════════════════════════════ */}
        {(topCategories.length > 0 || sortedCards.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Categories */}
            {topCategories.length > 0 && (
              <motion.div {...sectionReveal()}>
                <ThemedPanel className="p-5">
                  <ThemedLabel className="mb-5 text-[10px]">
                    Categories
                  </ThemedLabel>
                  <div className="space-y-4">
                    {topCategories.map((cat, i) => {
                      const trend = categoryTrends.get(cat.category);
                      const barWidth = (cat.total / maxCategoryTotal) * 100;
                      const catColor =
                        CATEGORY_COLORS[cat.category] ?? "#6B7280";
                      return (
                        <div key={cat.category}>
                          <div className="flex items-baseline justify-between">
                            <span
                              className="text-[13px]"
                              style={{
                                fontFamily: theme.bodyFont,
                                color: theme.text,
                              }}
                            >
                              {cat.category}
                            </span>
                            <div className="flex items-baseline gap-2.5">
                              <span
                                className="font-mono text-[13px] tabular-nums"
                                style={{ color: theme.text }}
                              >
                                {formatCurrency(cat.total)}
                              </span>
                              {trend && trend.direction !== "flat" && (
                                <span
                                  className="text-[10px] font-medium"
                                  style={{
                                    color:
                                      trend.direction === "up"
                                        ? theme.danger
                                        : theme.success,
                                  }}
                                >
                                  {trendArrow(trend.direction)} {trend.pct}%
                                </span>
                              )}
                            </div>
                          </div>
                          <ProportionBar
                            width={barWidth}
                            color={catColor}
                            delay={i * 0.06}
                          />
                        </div>
                      );
                    })}
                  </div>
                </ThemedPanel>
              </motion.div>
            )}

            {/* Cards */}
            {sortedCards.length > 0 && (
              <motion.div {...sectionReveal(0.08)}>
                <ThemedPanel className="p-5">
                  <ThemedLabel className="mb-5 text-[10px]">Cards</ThemedLabel>
                  <div className="space-y-4">
                    {sortedCards.map((card, i) => {
                      const barWidth = (card.total / maxCardTotal) * 100;
                      const cardColor = getCardColor(cards, card.card);
                      return (
                        <div key={card.card}>
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: cardColor }}
                              />
                              <span
                                className="text-[13px]"
                                style={{
                                  fontFamily: theme.bodyFont,
                                  color: theme.text,
                                }}
                              >
                                {getCardLabel(cards, card.card)}
                              </span>
                            </div>
                            <span
                              className="font-mono text-[13px] tabular-nums"
                              style={{ color: theme.text }}
                            >
                              {formatCurrency(card.total)}
                            </span>
                          </div>
                          <ProportionBar
                            width={barWidth}
                            color={cardColor}
                            delay={i * 0.06}
                          />
                        </div>
                      );
                    })}
                  </div>
                </ThemedPanel>
              </motion.div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TOP MERCHANTS — asymmetric grid, lead merchant is larger
            ════════════════════════════════════════════════════════ */}
        {topMerchants.length > 0 && (
          <motion.div {...sectionReveal()} className="mt-4">
            <ThemedPanel className="p-5">
              <ThemedLabel className="mb-4 text-[10px]">
                Top Merchants
              </ThemedLabel>

              {/* Lead merchant — spans full width */}
              {topMerchants[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  className="mb-3 flex items-baseline justify-between rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor:
                      theme.mode === "dark"
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.025)",
                    border:
                      theme.mode === "light"
                        ? `1px solid ${theme.border}`
                        : "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <p
                      className="text-[15px] font-medium"
                      style={{
                        color: theme.text,
                        fontFamily: theme.bodyFont,
                      }}
                    >
                      {topMerchants[0].merchant}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      <span style={{ fontFamily: theme.bodyFont }}>
                        {topMerchants[0].count} visit
                        {topMerchants[0].count !== 1 ? "s" : ""}
                      </span>
                      <span className="mx-1.5 opacity-40">·</span>
                      <span
                        className="font-mono"
                        style={{ color: theme.textMutedSmall }}
                      >
                        {formatCurrency(topMerchants[0].avg_amount)} avg
                      </span>
                    </p>
                  </div>
                  <p
                    className="font-mono text-lg tabular-nums"
                    style={{
                      color: theme.text,
                      fontFamily: theme.displayFont,
                      fontWeight: isPaper ? 400 : 700,
                    }}
                  >
                    {formatCurrency(topMerchants[0].total)}
                  </p>
                </motion.div>
              )}

              {/* Remaining merchants — compact grid */}
              {topMerchants.length > 1 && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
                  {topMerchants.slice(1).map((m, i) => (
                    <motion.div
                      key={m.merchant}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        duration: 0.4,
                        delay: 0.05 + i * 0.05,
                        ease: [0.22, 1, 0.36, 1] as const,
                      }}
                      className="rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor:
                          theme.mode === "dark"
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.015)",
                      }}
                    >
                      <p
                        className="truncate text-[12px]"
                        style={{
                          color: theme.text,
                          fontFamily: theme.bodyFont,
                        }}
                      >
                        {m.merchant}
                      </p>
                      <p
                        className="mt-0.5 font-mono text-[11px] tabular-nums"
                        style={{ color: theme.textMuted }}
                      >
                        {formatCurrency(m.total)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </ThemedPanel>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            ALERT — Anomaly narrative (conditional)
            ════════════════════════════════════════════════════════ */}
        {topAnomaly && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
            className="mt-4"
          >
            <div
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                backgroundColor:
                  theme.mode === "dark"
                    ? `color-mix(in srgb, ${alertBorderColor(topAnomaly.severity)} 4%, ${theme.surface})`
                    : `color-mix(in srgb, ${alertBorderColor(topAnomaly.severity)} 3%, ${theme.surface})`,
                border: `1px solid ${theme.mode === "dark" ? "rgba(255,255,255,0.06)" : theme.border}`,
                boxShadow: theme.cardShadow,
              }}
            >
              {/* Accent stripe */}
              <div
                className="absolute top-0 left-0 h-full w-[3px]"
                style={{
                  backgroundColor: alertBorderColor(topAnomaly.severity),
                }}
              />
              <p
                className="pl-3 text-[13px] leading-relaxed"
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.text,
                  lineHeight: theme.bodyLineHeight,
                }}
              >
                {topAnomaly.category} is running{" "}
                <span
                  className="font-mono font-medium"
                  style={{ color: theme.danger }}
                >
                  {Math.round(topAnomaly.pct_above_avg)}%
                </span>{" "}
                above your average this month.
                {categoryForecasts.has(topAnomaly.category) && (
                  <>
                    {" "}
                    At this pace, you&apos;ll hit{" "}
                    <span
                      className="font-mono font-medium"
                      style={{ color: theme.danger }}
                    >
                      {formatCurrency(
                        categoryForecasts.get(topAnomaly.category)!
                      )}
                    </span>{" "}
                    by end of month
                    {topAnomaly.avg_monthly > 0 && (
                      <>
                        {" — "}
                        <span className="font-mono">
                          {formatCurrency(
                            categoryForecasts.get(topAnomaly.category)! -
                              topAnomaly.avg_monthly
                          )}
                        </span>{" "}
                        more than typical
                      </>
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            SUBSCRIPTIONS — Compact recurring (conditional)
            ════════════════════════════════════════════════════════ */}
        {activeRecurring.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mt-4"
          >
            <ThemedPanel className="p-5">
              {/* Header line */}
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <ThemedLabel className="text-[10px]">Subscriptions</ThemedLabel>
                <span
                  className="text-[10px]"
                  style={{ color: theme.textMuted }}
                >
                  ·
                </span>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: theme.text }}
                >
                  {formatCurrency(recurringTotal)}/mo
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: theme.textMuted }}
                >
                  ·
                </span>
                <span
                  className="text-[10px]"
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.bodyFont,
                  }}
                >
                  {activeRecurring.length} active
                </span>
              </div>

              {/* Inline list */}
              <p
                className="mt-3 text-[13px] leading-relaxed"
                style={{ color: theme.text }}
              >
                {activeRecurring.slice(0, 6).map((r, i) => (
                  <span key={r.merchant}>
                    {i > 0 && (
                      <span
                        className="mx-1.5 opacity-30"
                        style={{ color: theme.textMuted }}
                      >
                        ·
                      </span>
                    )}
                    <span style={{ fontFamily: theme.bodyFont }}>
                      {r.merchant}
                    </span>{" "}
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: theme.textMuted }}
                    >
                      {formatCurrency(r.avg_amount)}
                    </span>
                  </span>
                ))}
                {activeRecurring.length > 6 && (
                  <span
                    className="ml-1.5 text-[11px]"
                    style={{ color: theme.textMuted }}
                  >
                    +{activeRecurring.length - 6} more
                  </span>
                )}
              </p>

              {/* Forgotten warning */}
              {forgottenRecurring.length > 0 && (
                <p
                  className="mt-3 text-[11px]"
                  style={{
                    color: theme.danger,
                    fontFamily: theme.bodyFont,
                    opacity: 0.85,
                  }}
                >
                  ⚠ {forgottenRecurring.length} possibly forgotten
                  {forgottenRecurring[0] && (
                    <>
                      {" "}
                      — {forgottenRecurring[0].merchant},{" "}
                      {forgottenRecurring[0].last_gap_days}d ago
                    </>
                  )}
                </p>
              )}
            </ThemedPanel>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            INSIGHT — Pull-quote (conditional)
            ════════════════════════════════════════════════════════ */}
        {topInsight && (
          <>
            <ThemedDivider className="mt-10 mb-10" />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 1 }}
              className="px-4 text-center md:px-12"
            >
              <p
                className="text-lg leading-relaxed md:text-xl"
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: isPaper ? 400 : 700,
                  fontStyle: isPaper ? "italic" : "normal",
                  color: theme.text,
                  lineHeight: 1.7,
                }}
              >
                &ldquo;{topInsight.message}&rdquo;
              </p>
            </motion.div>
          </>
        )}
      </div>
    </ThemedBackground>
  );
}
