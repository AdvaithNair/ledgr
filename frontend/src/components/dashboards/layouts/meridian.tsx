"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import {
  ThemedBackground,
  ThemedPanel,
  ThemedLabel,
  useTooltipStyle,
  useChartGradientId,
} from "@/components/dashboards/themed-components";
import { formatCurrency, fmt } from "@/lib/utils";
import { getCardColor, getCardLabel, CATEGORY_COLORS } from "@/lib/constants";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  ForecastData,
  CategoryAnomaly,
  RecurringTransaction,
  Insight,
  HabitAnalysis,
  DailySpending,
  EnhancedMerchant,
  Card,
  BudgetProgress,
  Transaction,
  ImportRecord,
} from "@/types";

export interface DashboardLayoutProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  recurring: RecurringTransaction[] | null;
  insights: Insight[] | null;
  habits: HabitAnalysis | null;
  daily: DailySpending[] | null;
  merchants: EnhancedMerchant[] | null;
  cards: Card[];
  budgetProgress?: BudgetProgress[];
  recentTransactions?: Transaction[];
  lastImport?: ImportRecord | null;
}

// ── Icon map for insights ──
const INSIGHT_ICONS: Record<string, string> = {
  "alert-triangle": "\u26A0",
  "trending-up": "\u2197",
  "trending-down": "\u2198",
  "dollar-sign": "$",
  repeat: "\u21BB",
  "check-circle": "\u2713",
};

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
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
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
        transition={{
          duration: 0.8,
          delay,
          ease: [0.22, 1, 0.36, 1] as const,
        }}
      />
    </div>
  );
}

// ── Animated progress bar (thicker, for velocity card) ──
function ProgressBar({
  pct,
  color,
  trackColor,
  delay = 0,
}: {
  pct: number;
  color: string;
  trackColor: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div
      ref={ref}
      className="h-[6px] overflow-hidden rounded-full"
      style={{ backgroundColor: trackColor }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(pct, 100)}%` } : { width: 0 }}
        transition={{
          duration: 1,
          delay,
          ease: [0.22, 1, 0.36, 1] as const,
        }}
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
  habits,
  merchants,
  cards,
  budgetProgress,
  recentTransactions,
  lastImport,
}: DashboardLayoutProps) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const gradientId = useChartGradientId("meridian");

  const heroAmount = useCountUp(summary.this_month);
  const isPaper = theme.style === "paper";

  // Dismiss state for anomaly banner
  const [alertDismissed, setAlertDismissed] = useState(false);

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
  const sortedAnomalies = useMemo(() => {
    if (!anomalies.length) return [];
    const severityOrder = { critical: 3, high: 2, elevated: 1 };
    return [...anomalies].sort(
      (a, b) =>
        (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
    );
  }, [anomalies]);

  const topAnomaly = sortedAnomalies[0] ?? null;

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

  // ── Helpers ──
  function sentimentColor(value: number | null | undefined) {
    if (value == null) return theme.textMuted;
    return value > 0 ? theme.danger : theme.success;
  }

  function trendArrow(dir: "up" | "down" | "flat") {
    if (dir === "up") return "\u25B2";
    if (dir === "down") return "\u25BC";
    return "\u2500";
  }

  function alertBorderColor(severity: string) {
    if (severity === "critical" || severity === "high") return theme.danger;
    if (severity === "elevated") return theme.accent;
    return theme.textMuted;
  }

  function insightSeverityColor(severity: string) {
    if (severity === "high") return theme.danger;
    if (severity === "medium") return theme.accent;
    return theme.success;
  }

  // Staggered scroll reveal
  const sectionReveal = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" as const },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  // Velocity card color logic
  const velocityBarColor = useMemo(() => {
    if (!forecast) return theme.success;
    const changePct = forecast.vs_average.projected_diff_pct ?? 0;
    if (changePct > 10) return theme.danger;
    if (changePct > 0) return theme.accent;
    return theme.success;
  }, [forecast, theme]);

  return (
    <ThemedBackground>
      <div className="mx-auto max-w-4xl px-6 pb-32">
        {/* ════════════════════════════════════════════════════════
            ANOMALY ALERT BANNER — Dismissible, at the top
            ════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {topAnomaly && !alertDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -16, height: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1] as const,
              }}
              className="overflow-hidden pt-6"
            >
              <div
                className="relative overflow-hidden rounded-2xl p-4"
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
                <div className="flex items-center justify-between pl-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] leading-relaxed"
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
                              {" \u2014 "}
                              <span className="font-mono">
                                {formatCurrency(
                                  categoryForecasts.get(
                                    topAnomaly.category
                                  )! - topAnomaly.avg_monthly
                                )}
                              </span>{" "}
                              more than typical
                            </>
                          )}
                          .
                        </>
                      )}
                    </p>
                    {sortedAnomalies.length > 1 && (
                      <p
                        className="mt-1 text-[11px]"
                        style={{
                          color: theme.textMuted,
                          fontFamily: theme.bodyFont,
                        }}
                      >
                        and {sortedAnomalies.length - 1} more unusual pattern
                        {sortedAnomalies.length > 2 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setAlertDismissed(true)}
                    className="ml-4 flex-shrink-0 rounded-lg p-1.5 transition-colors"
                    style={{
                      color: theme.textMuted,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = theme.text;
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        theme.mode === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        theme.textMuted;
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  : "\u2500"}
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
                  : "\u2500"}
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
                      (forecast.vs_average.projected_diff_pct ?? 0) > 0
                        ? theme.danger
                        : theme.success,
                  }}
                >
                  {formatCurrency(forecast.projections.recommended)}
                </span>
              </motion.div>
            )}
          </motion.div>

        </div>

        {/* ════════════════════════════════════════════════════════
            INSIGHTS CAROUSEL — Horizontal scrollable insight cards
            ════════════════════════════════════════════════════════ */}
        {insights && insights.length > 0 && (
          <motion.div {...sectionReveal()} className="mt-2 mb-2">
            <div
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {insights.map((insight, i) => (
                <motion.div
                  key={`${insight.type}-${insight.title}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  className="relative flex-shrink-0 overflow-hidden rounded-xl"
                  style={{
                    width: 272,
                    scrollSnapAlign: "start",
                    backgroundColor:
                      theme.mode === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(255,255,255,0.7)",
                    border: `1px solid ${theme.mode === "dark" ? "rgba(255,255,255,0.06)" : theme.border}`,
                    backdropFilter:
                      theme.mode === "dark" ? "blur(8px)" : "none",
                    boxShadow: theme.cardShadow,
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute top-0 left-0 h-full w-[2px]"
                    style={{
                      backgroundColor: insightSeverityColor(insight.severity),
                    }}
                  />
                  <div className="flex items-start gap-3 p-4 pl-5">
                    <span
                      className="mt-0.5 flex-shrink-0 text-base"
                      style={{ opacity: 0.7 }}
                    >
                      {INSIGHT_ICONS[insight.icon] ?? "\u2022"}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className="truncate text-[13px] font-medium"
                        style={{
                          color: theme.text,
                          fontFamily: theme.bodyFont,
                        }}
                      >
                        {insight.title}
                      </h3>
                      <p
                        className="mt-1 line-clamp-2 text-[11px] leading-relaxed"
                        style={{
                          color: theme.textMuted,
                          fontFamily: theme.bodyFont,
                        }}
                      >
                        {insight.message}
                      </p>
                      {insight.metric && (
                        <p
                          className="mt-2 font-mono text-base font-medium tabular-nums"
                          style={{ color: theme.text }}
                        >
                          {formatCurrency(insight.metric.value)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            SPENDING VELOCITY — Daily rate, projected, progress bars
            ════════════════════════════════════════════════════════ */}
        {forecast && (
          <motion.div {...sectionReveal()} className="mt-4">
            <ThemedPanel className="p-5">
              <ThemedLabel className="mb-4 text-[10px]">
                Spending Velocity
              </ThemedLabel>

              {/* Three stats row */}
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: theme.textMuted,
                      fontFamily: theme.bodyFont,
                    }}
                  >
                    Daily Rate
                  </p>
                  <p
                    className="mt-1 font-mono text-lg tabular-nums"
                    style={{ color: theme.text }}
                  >
                    {formatCurrency(summary.daily_rate)}/day
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: theme.textMuted,
                      fontFamily: theme.bodyFont,
                    }}
                  >
                    Projected
                  </p>
                  <p
                    className="mt-1 font-mono text-lg tabular-nums"
                    style={{ color: theme.text }}
                  >
                    {formatCurrency(forecast.projections.recommended)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: theme.textMuted,
                      fontFamily: theme.bodyFont,
                    }}
                  >
                    Average
                  </p>
                  <p
                    className="mt-1 font-mono text-lg tabular-nums"
                    style={{ color: theme.text }}
                  >
                    {formatCurrency(summary.avg_monthly)}
                  </p>
                </div>
              </div>

              {/* Month progress bar */}
              <div className="mb-3">
                <div className="mb-1.5 flex justify-between">
                  <span
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: theme.textMuted,
                      fontFamily: theme.bodyFont,
                    }}
                  >
                    Month Progress
                  </span>
                  <span
                    className="font-mono text-[11px] tabular-nums"
                    style={{ color: theme.textMuted }}
                  >
                    {forecast.current_month.days_elapsed} /{" "}
                    {forecast.current_month.days_in_month} days
                  </span>
                </div>
                <ProgressBar
                  pct={
                    (forecast.current_month.days_elapsed /
                      forecast.current_month.days_in_month) *
                    100
                  }
                  color={
                    theme.mode === "dark"
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.15)"
                  }
                  trackColor={
                    theme.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)"
                  }
                />
              </div>

              {/* Spending trajectory bar */}
              <div>
                <div className="mb-1.5 flex justify-between">
                  <span
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: theme.textMuted,
                      fontFamily: theme.bodyFont,
                    }}
                  >
                    Projected vs Average
                  </span>
                  <span
                    className="font-mono text-[11px] tabular-nums"
                    style={{
                      color: sentimentColor(
                        forecast.vs_average?.projected_diff_pct ?? 0
                      ),
                    }}
                  >
                    {(forecast.vs_average?.projected_diff_pct ?? 0) > 0 ? "+" : ""}
                    {fmt(forecast.vs_average?.projected_diff_pct)}%
                  </span>
                </div>
                <ProgressBar
                  pct={
                    (forecast.projections.recommended / summary.avg_monthly) *
                    100
                  }
                  color={velocityBarColor}
                  trackColor={
                    theme.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)"
                  }
                  delay={0.15}
                />
              </div>
            </ThemedPanel>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            BUDGET PROGRESS — Conditional, only when budgets exist
            ════════════════════════════════════════════════════════ */}
        {budgetProgress && budgetProgress.length > 0 && (
          <motion.div {...sectionReveal()} className="mt-4">
            <ThemedPanel className="p-5">
              <ThemedLabel className="mb-4 text-[10px]">
                Budget Progress
              </ThemedLabel>
              <div className="space-y-4">
                {[...budgetProgress]
                  .sort((a, b) => b.pct_used - a.pct_used)
                  .map((bp, i) => {
                    const barColor =
                      bp.status === "over_budget"
                        ? theme.danger
                        : bp.status === "warning"
                          ? theme.accent
                          : theme.success;

                    const statusLabel =
                      bp.status === "over_budget"
                        ? "Over"
                        : bp.status === "warning"
                          ? "Warning"
                          : "On Track";

                    const statusStyle =
                      bp.status === "over_budget"
                        ? { backgroundColor: `color-mix(in srgb, ${theme.danger} 15%, transparent)`, color: theme.danger }
                        : bp.status === "warning"
                          ? { backgroundColor: `color-mix(in srgb, ${theme.accent} 15%, transparent)`, color: theme.accent }
                          : { backgroundColor: `color-mix(in srgb, ${theme.success} 15%, transparent)`, color: theme.success };

                    return (
                      <div key={bp.category}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span
                            className="text-[13px]"
                            style={{
                              fontFamily: theme.bodyFont,
                              color: theme.text,
                            }}
                          >
                            {bp.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-[13px] tabular-nums"
                              style={{ color: theme.text }}
                            >
                              {formatCurrency(bp.spent)}
                            </span>
                            <span
                              className="font-mono text-[11px] tabular-nums"
                              style={{ color: theme.textMuted }}
                            >
                              / {formatCurrency(bp.monthly_limit)}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={statusStyle}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <ProgressBar
                          pct={bp.pct_used}
                          color={barColor}
                          trackColor={
                            theme.mode === "dark"
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.06)"
                          }
                          delay={i * 0.08}
                        />

                        {/* Projected marker */}
                        {bp.status !== "over_budget" &&
                          bp.projected_pct > bp.pct_used && (
                            <div className="relative mt-0.5 h-0">
                              <div
                                className="absolute h-2 w-0.5 rounded"
                                style={{
                                  left: `${Math.min(bp.projected_pct, 100)}%`,
                                  backgroundColor: theme.textMuted,
                                  opacity: 0.5,
                                }}
                                title={`Projected: ${formatCurrency(bp.projected_spend)}`}
                              />
                            </div>
                          )}
                      </div>
                    );
                  })}
              </div>
            </ThemedPanel>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            TREND CHART — 12-month trajectory
            ════════════════════════════════════════════════════════ */}
        {chartData.length > 0 && (
          <motion.div {...sectionReveal()} className="mt-4">
            <ThemedPanel className="overflow-hidden p-0">
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
                      formatter={(v?: number, name?: string) => {
                        if (v == null) return ["\u2014", name ?? ""];
                        const label =
                          name === "rollingAvg" ? "3-Mo Avg" : "Actual";
                        return [formatCurrency(v), label];
                      }}
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
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: 10,
                        color: theme.textMuted,
                        fontFamily: theme.bodyFont,
                        paddingBottom: 8,
                      }}
                      formatter={(value: string) =>
                        value === "rollingAvg" ? "3-Mo Avg" : "Actual"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="total"
                      stroke={theme.chartStroke}
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                      animationDuration={1200}
                    />
                    <Line
                      type="monotone"
                      dataKey="rollingAvg"
                      name="rollingAvg"
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
                            <Link
                              href={`/analytics?tab=habits&category=${encodeURIComponent(cat.category)}`}
                              className="text-[13px] transition-opacity hover:opacity-70"
                              style={{
                                fontFamily: theme.bodyFont,
                                color: theme.text,
                                textDecoration: "none",
                              }}
                            >
                              {cat.category}
                            </Link>
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
            TOP MERCHANTS — Enhanced with frequency + active months
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
                    <Link
                      href={`/transactions?search=${encodeURIComponent(topMerchants[0].merchant)}&date_range=all`}
                      className="text-[15px] font-medium transition-opacity hover:opacity-70"
                      style={{
                        color: theme.text,
                        fontFamily: theme.bodyFont,
                        textDecoration: "none",
                        display: "block",
                      }}
                    >
                      {topMerchants[0].merchant}
                    </Link>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      <span style={{ fontFamily: theme.bodyFont }}>
                        {topMerchants[0].count} txn
                        {topMerchants[0].count !== 1 ? "s" : ""}
                      </span>
                      <span className="mx-1.5 opacity-40">&middot;</span>
                      <span
                        className="font-mono"
                        style={{ color: theme.textMutedSmall }}
                      >
                        ~{formatCurrency(topMerchants[0].avg_amount)}/txn
                      </span>
                      <span className="mx-1.5 opacity-40">&middot;</span>
                      <span style={{ fontFamily: theme.bodyFont }}>
                        {topMerchants[0].active_months} month
                        {topMerchants[0].active_months !== 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
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
                    <p
                      className="mt-0.5 font-mono text-[11px] tabular-nums"
                      style={{ color: theme.textMuted }}
                    >
                      {topMerchants[0].monthly_frequency.toFixed(1)}x/mo
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Remaining merchants — compact grid with enhanced data */}
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
                      <Link
                        href={`/transactions?search=${encodeURIComponent(m.merchant)}&date_range=all`}
                        className="block truncate text-[12px] transition-opacity hover:opacity-70"
                        style={{
                          color: theme.text,
                          fontFamily: theme.bodyFont,
                          textDecoration: "none",
                        }}
                      >
                        {m.merchant}
                      </Link>
                      <p
                        className="mt-0.5 font-mono text-[11px] tabular-nums"
                        style={{ color: theme.textMuted }}
                      >
                        {formatCurrency(m.total)}
                      </p>
                      <p
                        className="mt-0.5 text-[10px]"
                        style={{
                          color: theme.textMuted,
                          fontFamily: theme.bodyFont,
                          opacity: 0.7,
                        }}
                      >
                        {m.count} txns &middot; {m.active_months}mo
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </ThemedPanel>
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
                  &middot;
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
                  &middot;
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
                        &middot;
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
                  {"\u26A0"} {forgottenRecurring.length} possibly forgotten
                  {forgottenRecurring[0] && (
                    <>
                      {" "}
                      &mdash; {forgottenRecurring[0].merchant},{" "}
                      {forgottenRecurring[0].last_gap_days}d ago
                    </>
                  )}
                </p>
              )}
            </ThemedPanel>
          </motion.div>
        )}
        {/* ════════════════════════════════════════════════════════
            RECENT TRANSACTIONS + QUICK LINKS — Bottom row
            ════════════════════════════════════════════════════════ */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recent Transactions */}
          {recentTransactions && recentTransactions.length > 0 && (
            <motion.div {...sectionReveal()}>
              <ThemedPanel className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <ThemedLabel className="text-[10px]">
                    Recent Transactions
                  </ThemedLabel>
                  <Link
                    href="/transactions"
                    className="text-[11px] transition-opacity hover:opacity-80"
                    style={{ color: theme.accent, fontFamily: theme.bodyFont }}
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((txn) => {
                    const catColor =
                      CATEGORY_COLORS[txn.category] ?? "#6B7280";
                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-[13px]"
                              style={{
                                fontFamily: theme.bodyFont,
                                color: theme.text,
                              }}
                            >
                              {txn.description}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{
                                color: theme.textMuted,
                                fontFamily: theme.bodyFont,
                              }}
                            >
                              {new Date(txn.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <span
                          className="ml-3 flex-shrink-0 font-mono text-[13px] tabular-nums"
                          style={{ color: theme.text }}
                        >
                          {formatCurrency(txn.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ThemedPanel>
            </motion.div>
          )}

          {/* Analytics Preview + Import Prompt */}
          <motion.div {...sectionReveal(0.08)} className="space-y-4">
            {/* Analytics Preview */}
            {(habits || recurring) && (
              <ThemedPanel className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <ThemedLabel className="text-[10px]">
                    Analytics
                  </ThemedLabel>
                  <Link
                    href="/analytics"
                    className="text-[11px] transition-opacity hover:opacity-80"
                    style={{ color: theme.accent, fontFamily: theme.bodyFont }}
                  >
                    View Analytics
                  </Link>
                </div>
                <div className="space-y-3">
                  {habits && (
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[12px]"
                        style={{
                          fontFamily: theme.bodyFont,
                          color: theme.textMuted,
                        }}
                      >
                        Impulse Score
                      </span>
                      <span
                        className="font-mono text-[13px] tabular-nums"
                        style={{ color: theme.text }}
                      >
                        {habits.impulse_spending.score}/100
                      </span>
                    </div>
                  )}
                  {recurringTotal > 0 && (
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[12px]"
                        style={{
                          fontFamily: theme.bodyFont,
                          color: theme.textMuted,
                        }}
                      >
                        Subscriptions
                      </span>
                      <span
                        className="font-mono text-[13px] tabular-nums"
                        style={{ color: theme.text }}
                      >
                        {formatCurrency(recurringTotal)}/mo
                      </span>
                    </div>
                  )}
                  {forecast && (
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[12px]"
                        style={{
                          fontFamily: theme.bodyFont,
                          color: theme.textMuted,
                        }}
                      >
                        Month Trajectory
                      </span>
                      <span
                        className="text-[12px] font-medium"
                        style={{
                          fontFamily: theme.bodyFont,
                          color:
                            forecast.trajectory === "below_average"
                              ? theme.success
                              : forecast.trajectory === "above_average" ||
                                  forecast.trajectory === "well_above_average"
                                ? theme.danger
                                : theme.accent,
                        }}
                      >
                        {forecast.trajectory
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  )}
                </div>
              </ThemedPanel>
            )}

            {/* Import Prompt */}
            {lastImport !== undefined && (
              (() => {
                if (!lastImport) {
                  return (
                    <ThemedPanel className="p-5">
                      <Link
                        href="/import"
                        className="flex items-center gap-3 transition-opacity hover:opacity-80"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={theme.accent}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span
                          className="text-[13px]"
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.accent,
                          }}
                        >
                          Import your first CSV
                        </span>
                      </Link>
                    </ThemedPanel>
                  );
                }
                const daysSince = Math.floor(
                  (Date.now() - new Date(lastImport.imported_at).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                if (daysSince > 14) {
                  return (
                    <ThemedPanel
                      className="p-5"
                      style={{
                        borderLeft: `3px solid ${theme.accent}`,
                      }}
                    >
                      <Link
                        href="/import"
                        className="flex items-center gap-3 transition-opacity hover:opacity-80"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={theme.accent}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span
                          className="text-[13px]"
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.accent,
                          }}
                        >
                          Your last import was {daysSince} days ago
                        </span>
                      </Link>
                    </ThemedPanel>
                  );
                }
                return null;
              })()
            )}
          </motion.div>
        </div>
      </div>
    </ThemedBackground>
  );
}
