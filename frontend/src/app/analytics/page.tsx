"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import { PageShell } from "@/components/page-shell";
import {
  ThemedPanel,
  ThemedLabel,
  ThemedTable,
  ThemedTh,
  ThemedTd,
  ThemedTr,
  ThemedStat,
  useTooltipStyle,
  useChartGradientId,
} from "@/components/dashboards/themed-components";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { ThemedBadge } from "@/components/ui/themed-badge";
import { formatCurrency, formatDate, cn, fmt } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  getHabits,
  getPatterns,
  getDaily,
  getRecurring,
  getForecast,
  getMonthly,
  getCategoryDeepDive,
  getBudgetProgress,
} from "@/lib/api";
import type {
  HabitAnalysis,
  PatternData,
  DailySpending,
  RecurringTransaction,
  ForecastData,
  MonthlyData,
  CategoryDeepDive,
  BudgetProgress,
} from "@/types";

// ── Types ──

type TabId = "habits" | "patterns" | "subscriptions" | "forecast" | "yoy";

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "habits", label: "Habits" },
  { id: "patterns", label: "Patterns" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "forecast", label: "Forecast" },
  { id: "yoy", label: "Compare" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const YEAR_COLORS = ["#6B7280", "#3B82F6", "#10B981", "#F59E0B"];

// ── Panel animation wrapper ──

function RevealPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Tab Selector ──

function TabSelector({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: "9999px",
        padding: "4px",
        backgroundColor:
          theme.mode === "dark"
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.04)",
        border: `1px solid ${theme.border}`,
        flexWrap: "wrap",
        gap: "2px",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "8px 18px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontFamily: theme.bodyFont,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              transition: "all 200ms",
              backgroundColor: isActive ? theme.accentMuted : "transparent",
              color: isActive ? theme.accent : theme.textMuted,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = theme.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = theme.textMuted;
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Loading skeleton for each tab ──

function TabSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <ThemedSkeleton variant="card" />
      <ThemedSkeleton variant="chart" />
      <ThemedSkeleton variant="card" />
    </div>
  );
}

// ── Proportion Bar ──

function ProportionBar({
  value,
  max,
  color,
  bgColor,
}: {
  value: number;
  max: number;
  color: string;
  bgColor: string;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div
      style={{
        width: "100%",
        height: "8px",
        borderRadius: "4px",
        backgroundColor: bgColor,
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          height: "100%",
          borderRadius: "4px",
          backgroundColor: color,
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// HABITS TAB
// ═══════════════════════════════════════════

function HabitsTab({
  data,
  onCategoryClick,
}: {
  data: HabitAnalysis;
  onCategoryClick: (category: string) => void;
}) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();

  const weekendChartData = useMemo(() => {
    const weekdayAvg = data.weekend_splurge.weekday_avg_daily;
    const weekendAvg = data.weekend_splurge.weekend_avg_daily;
    return DAY_LABELS.map((day, i) => ({
      day,
      value: i >= 5 ? weekendAvg : weekdayAvg,
      isWeekend: i >= 5,
    }));
  }, [data.weekend_splurge]);

  const barFillWeekend = theme.accent;
  const barFillWeekday =
    theme.mode === "dark"
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.12)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Impulse Spending */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Impulse Spending</ThemedLabel>
          <div
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div style={{ flex: 1 }}>
              <ProportionBar
                value={data.impulse_spending.score}
                max={10}
                color={theme.accent}
                bgColor={
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)"
                }
              />
            </div>
            <span
              style={{
                fontFamily: theme.bodyFont,
                fontWeight: 600,
                fontSize: "14px",
                color: theme.accent,
                minWidth: "60px",
                textAlign: "right",
              }}
            >
              {data.impulse_spending.score}/10 {data.impulse_spending.label}
            </span>
          </div>
          <p
            style={{
              fontFamily: theme.bodyFont,
              color: theme.textMuted,
              fontSize: "13px",
              lineHeight: "1.6",
              marginTop: "12px",
            }}
          >
            {data.impulse_spending.message}
          </p>
        </ThemedPanel>
      </RevealPanel>

      {/* Weekend Splurge */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Weekend Splurge</ThemedLabel>
          <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
            <ThemedStat
              label="Weekday Avg"
              value={formatCurrency(data.weekend_splurge.weekday_avg_daily)}
            />
            <ThemedStat
              label="Weekend Avg"
              value={formatCurrency(data.weekend_splurge.weekend_avg_daily)}
            />
          </div>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekendChartData} barCategoryGap="20%">
                <XAxis
                  dataKey="day"
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v?: number) =>
                    v != null ? `$${v.toFixed(0)}` : ""
                  }
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v?: number) =>
                    v != null ? [formatCurrency(v), "Daily Avg"] : []
                  }
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                >
                  {weekendChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.isWeekend ? barFillWeekend : barFillWeekday}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p
            style={{
              fontFamily: theme.bodyFont,
              color: theme.textMuted,
              fontSize: "13px",
              lineHeight: "1.6",
              marginTop: "8px",
            }}
          >
            {data.weekend_splurge.message}
          </p>
        </ThemedPanel>
      </RevealPanel>

      {/* Category Creep */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Category Creep</ThemedLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
            {data.category_creep.map((cat) => {
              const isUp = cat.trend === "increasing";
              const isDown = cat.trend === "decreasing";
              const trendColor = isUp
                ? theme.danger
                : isDown
                  ? theme.success
                  : theme.textMuted;
              const arrow = isUp ? "\u25B2" : isDown ? "\u25BC" : "\u2014";

              const sparkData = cat.monthly_totals.map((v, i) => ({
                m: i,
                v,
              }));

              return (
                <div
                  key={cat.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: "pointer",
                  }}
                  onClick={() => onCategoryClick(cat.category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCategoryClick(cat.category);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.text,
                      fontSize: "13px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {cat.category}
                  </span>
                  <span
                    style={{
                      color: trendColor,
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: theme.bodyFont,
                      minWidth: "50px",
                      textAlign: "right",
                    }}
                  >
                    {arrow}{" "}
                    {fmt(Math.abs(cat.three_month_change_pct ?? 0), 0)}%
                  </span>
                  <div style={{ width: 80, height: 20 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={isUp ? theme.danger : theme.accent}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
            {data.category_creep.length === 0 && (
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textMuted,
                  fontSize: "13px",
                }}
              >
                No significant category trends detected.
              </p>
            )}
          </div>
        </ThemedPanel>
      </RevealPanel>

      {/* Merchant Concentration */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Merchant Concentration</ThemedLabel>
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.text,
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {data.merchant_concentration.top_merchant}
              </span>
              <span
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.accent,
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {fmt(data.merchant_concentration?.top_merchant_pct)}%
              </span>
            </div>
            <ProportionBar
              value={data.merchant_concentration.top_merchant_pct}
              max={100}
              color={theme.accent}
              bgColor={
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)"
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontFamily: theme.bodyFont,
                color: theme.textMuted,
                fontSize: "12px",
              }}
            >
              Top 3 merchants
            </span>
            <span
              style={{
                fontFamily: theme.bodyFont,
                color: theme.text,
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {fmt(data.merchant_concentration?.top_3_pct)}%
            </span>
          </div>
          <p
            style={{
              fontFamily: theme.bodyFont,
              color: theme.textMuted,
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {data.merchant_concentration.message}
          </p>
        </ThemedPanel>
      </RevealPanel>
    </div>
  );
}

// ═══════════════════════════════════════════
// PATTERNS TAB
// ═══════════════════════════════════════════

function PatternsTab({
  patterns,
  daily,
}: {
  patterns: PatternData;
  daily: DailySpending[];
}) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const areaGradientId = useChartGradientId("patterns-area");

  // Day of week chart data
  const dowData = useMemo(() => {
    return patterns.day_of_week
      .sort((a, b) => a.day_num - b.day_num)
      .map((d) => ({
        day: d.day.slice(0, 3),
        avg: d.count > 0 ? d.total / d.count : 0,
        total: d.total,
      }));
  }, [patterns.day_of_week]);

  const dowHighest = useMemo(() => {
    const sorted = [...dowData].sort((a, b) => b.avg - a.avg);
    return sorted[0];
  }, [dowData]);

  const dowLowest = useMemo(() => {
    const sorted = [...dowData].sort((a, b) => a.avg - b.avg);
    return sorted[0];
  }, [dowData]);

  // Day of month chart data
  const domData = useMemo(() => {
    return patterns.day_of_month
      .sort((a, b) => a.day - b.day)
      .map((d) => ({
        day: d.day,
        avg: d.count > 0 ? d.total / d.count : 0,
      }));
  }, [patterns.day_of_month]);

  // 365-day heatmap
  const heatmapData = useMemo(() => {
    if (!daily || daily.length === 0) return null;

    const sorted = [...daily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Take up to last 365 days
    const last365 = sorted.slice(-365);
    if (last365.length === 0) return null;

    const lookup = new Map<string, number>();
    let maxSpend = 0;
    for (const d of last365) {
      lookup.set(d.date, d.total);
      if (d.total > maxSpend) maxSpend = d.total;
    }

    // Build grid: find start date, align to Monday
    const startDate = new Date(last365[0].date);
    const endDate = new Date(last365[last365.length - 1].date);

    const startDow = startDate.getDay(); // 0=Sun
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() + mondayOffset);

    const weeks: Array<{
      dates: Array<{ date: string; total: number; dayOfWeek: number } | null>;
      monthLabel: string | null;
    }> = [];

    const cursor = new Date(gridStart);
    let currentWeekIdx = -1;

    while (cursor <= endDate || weeks.length === 0) {
      const dow = cursor.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6

      if (adjustedDow === 0) {
        currentWeekIdx++;
        const monthStr = cursor.toLocaleDateString("en-US", {
          month: "short",
        });
        const prevWeek = weeks[weeks.length - 1];
        const showMonth =
          currentWeekIdx === 0 ||
          (prevWeek && prevWeek.monthLabel !== monthStr);

        weeks.push({
          dates: new Array(7).fill(null),
          monthLabel: showMonth ? monthStr : null,
        });
      }

      if (currentWeekIdx >= 0 && weeks[currentWeekIdx]) {
        const dateStr = cursor.toISOString().split("T")[0];
        const total = lookup.get(dateStr) ?? 0;
        weeks[currentWeekIdx].dates[adjustedDow] = {
          date: dateStr,
          total,
          dayOfWeek: adjustedDow,
        };
      }

      cursor.setDate(cursor.getDate() + 1);
      if (cursor > endDate && adjustedDow === 6) break;
    }

    return { weeks, maxSpend };
  }, [daily]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Day of Week */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Day of Week</ThemedLabel>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData} barCategoryGap="20%">
                <XAxis
                  dataKey="day"
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v?: number) =>
                    v != null ? `$${v.toFixed(0)}` : ""
                  }
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v?: number) =>
                    v != null ? [formatCurrency(v), "Avg"] : []
                  }
                />
                <Bar
                  dataKey="avg"
                  fill={theme.chartStroke}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {dowHighest && dowLowest && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "12px",
                fontFamily: theme.bodyFont,
                fontSize: "12px",
              }}
            >
              <span style={{ color: theme.textMuted }}>
                Highest:{" "}
                <span style={{ color: theme.text, fontWeight: 500 }}>
                  {dowHighest.day} ({formatCurrency(dowHighest.avg)})
                </span>
              </span>
              <span style={{ color: theme.textMuted }}>
                Lowest:{" "}
                <span style={{ color: theme.text, fontWeight: 500 }}>
                  {dowLowest.day} ({formatCurrency(dowLowest.avg)})
                </span>
              </span>
            </div>
          )}
        </ThemedPanel>
      </RevealPanel>

      {/* Day of Month */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Day of Month</ThemedLabel>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={domData}>
                <defs>
                  <linearGradient
                    id={areaGradientId}
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
                <XAxis
                  dataKey="day"
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v?: number) =>
                    v != null ? `$${v.toFixed(0)}` : ""
                  }
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v?: number) =>
                    v != null ? [formatCurrency(v), "Avg"] : []
                  }
                />
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke={theme.chartStroke}
                  strokeWidth={2}
                  fill={`url(#${areaGradientId})`}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ThemedPanel>
      </RevealPanel>

      {/* 365-Day Heatmap */}
      {heatmapData && (
        <RevealPanel>
          <ThemedPanel className="p-5">
            <ThemedLabel className="mb-3">Daily Spending</ThemedLabel>
            <div style={{ overflowX: "auto" }}>
              <HeatmapGrid
                weeks={heatmapData.weeks}
                maxSpend={heatmapData.maxSpend}
              />
            </div>
          </ThemedPanel>
        </RevealPanel>
      )}
    </div>
  );
}

// ── Heatmap Grid Component ──

function HeatmapGrid({
  weeks,
  maxSpend,
}: {
  weeks: Array<{
    dates: Array<{ date: string; total: number; dayOfWeek: number } | null>;
    monthLabel: string | null;
  }>;
  maxSpend: number;
}) {
  const { theme } = useTheme();
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    total: number;
    x: number;
    y: number;
  } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const dayLabels = ["M", "", "W", "", "F", "", "S"];
  const cellSize = 12;
  const cellGap = 3;

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {/* Month labels */}
      <div
        style={{
          display: "flex",
          marginLeft: `${20 + cellGap}px`,
          marginBottom: "4px",
        }}
      >
        {weeks.map((week, i) => (
          <div
            key={i}
            style={{
              width: `${cellSize + cellGap}px`,
              fontSize: "9px",
              fontFamily: theme.bodyFont,
              color: theme.textMuted,
            }}
          >
            {week.monthLabel ?? ""}
          </div>
        ))}
      </div>

      <div style={{ display: "flex" }}>
        {/* Day labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${cellGap}px`,
            marginRight: `${cellGap}px`,
            width: "20px",
          }}
        >
          {dayLabels.map((label, i) => (
            <div
              key={i}
              style={{
                height: `${cellSize}px`,
                display: "flex",
                alignItems: "center",
                fontSize: "9px",
                fontFamily: theme.bodyFont,
                color: theme.textMuted,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "flex", gap: `${cellGap}px` }}>
          {weeks.map((week, wIdx) => (
            <div
              key={wIdx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: `${cellGap}px`,
              }}
            >
              {week.dates.map((cell, dIdx) => {
                if (!cell) {
                  return (
                    <div
                      key={dIdx}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: "2px",
                      }}
                    />
                  );
                }

                const intensity =
                  maxSpend > 0
                    ? Math.min(cell.total / maxSpend, 1)
                    : 0;

                const bgColor =
                  intensity === 0
                    ? theme.mode === "dark"
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.04)"
                    : theme.mode === "dark"
                      ? `color-mix(in srgb, ${theme.accent} ${Math.round(intensity * 80 + 10)}%, rgba(255,255,255,0.04))`
                      : `color-mix(in srgb, ${theme.accent} ${Math.round(intensity * 70 + 10)}%, rgba(0,0,0,0.04))`;

                return (
                  <div
                    key={dIdx}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: "2px",
                      backgroundColor: bgColor,
                      cursor: "pointer",
                      transition: "transform 100ms",
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = containerRef.current?.getBoundingClientRect();
                      if (parentRect) {
                        setHoveredCell({
                          date: cell.date,
                          total: cell.total,
                          x: rect.left - parentRect.left + cellSize / 2,
                          y: rect.top - parentRect.top - 8,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "12px",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: theme.bodyFont,
            color: theme.textMuted,
          }}
        >
          Less
        </span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: "2px",
              backgroundColor:
                intensity === 0
                  ? theme.mode === "dark"
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.04)"
                  : `color-mix(in srgb, ${theme.accent} ${Math.round(intensity * 80 + 10)}%, ${theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"})`,
            }}
          />
        ))}
        <span
          style={{
            fontSize: "10px",
            fontFamily: theme.bodyFont,
            color: theme.textMuted,
          }}
        >
          More
        </span>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              left: hoveredCell.x,
              top: hoveredCell.y,
              transform: "translate(-50%, -100%)",
              padding: "6px 10px",
              borderRadius: "8px",
              backgroundColor: theme.tooltipBg,
              border: `1px solid ${theme.tooltipBorder}`,
              fontSize: "11px",
              fontFamily: theme.bodyFont,
              color: theme.text,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <span style={{ color: theme.textMuted }}>
              {hoveredCell.date}
            </span>{" "}
            <span style={{ fontWeight: 600 }}>
              {formatCurrency(hoveredCell.total)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUBSCRIPTIONS TAB
// ═══════════════════════════════════════════

function SubscriptionsTab({
  recurring,
  totalMonthly,
  totalAnnual,
}: {
  recurring: RecurringTransaction[];
  totalMonthly: number;
  totalAnnual: number;
}) {
  const { theme } = useTheme();

  const activeRecurring = useMemo(
    () =>
      [...recurring]
        .filter((r) => r.status === "active")
        .sort((a, b) => b.avg_amount - a.avg_amount),
    [recurring]
  );

  const forgotten = useMemo(
    () => recurring.filter((r) => r.potentially_forgotten),
    [recurring]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Summary Stats */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            <ThemedStat
              label="Monthly Total"
              value={formatCurrency(totalMonthly)}
            />
            <ThemedStat
              label="Annual Total"
              value={formatCurrency(totalAnnual)}
            />
            <ThemedStat
              label="Active Count"
              value={activeRecurring.length.toString()}
            />
          </div>
        </ThemedPanel>
      </RevealPanel>

      {/* Active Subscriptions Table */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Active Subscriptions</ThemedLabel>
          {activeRecurring.length > 0 ? (
            <ThemedTable>
              <thead>
                <tr>
                  <ThemedTh>Merchant</ThemedTh>
                  <ThemedTh>Frequency</ThemedTh>
                  <ThemedTh numeric>Amount</ThemedTh>
                  <ThemedTh numeric>Annual</ThemedTh>
                </tr>
              </thead>
              <tbody>
                {activeRecurring.map((r) => (
                  <ThemedTr key={r.merchant}>
                    <ThemedTd>{r.merchant}</ThemedTd>
                    <ThemedTd>{r.frequency}</ThemedTd>
                    <ThemedTd numeric>
                      {formatCurrency(r.avg_amount)}
                    </ThemedTd>
                    <ThemedTd numeric>
                      {formatCurrency(r.estimated_annual)}
                    </ThemedTd>
                  </ThemedTr>
                ))}
              </tbody>
            </ThemedTable>
          ) : (
            <p
              style={{
                fontFamily: theme.bodyFont,
                color: theme.textMuted,
                fontSize: "13px",
              }}
            >
              No active recurring transactions detected.
            </p>
          )}
        </ThemedPanel>
      </RevealPanel>

      {/* Possibly Forgotten */}
      {forgotten.length > 0 && (
        <RevealPanel>
          <div
            style={{
              borderRadius: theme.panelRadius,
              overflow: "hidden",
              border: `1px solid color-mix(in srgb, ${theme.danger} 30%, transparent)`,
            }}
          >
            {/* Danger accent stripe */}
            <div
              style={{
                height: "3px",
                backgroundColor: theme.danger,
              }}
            />
            <div
              style={{
                padding: "20px",
                backgroundColor:
                  theme.mode === "dark"
                    ? "rgba(248, 113, 113, 0.04)"
                    : "rgba(220, 38, 38, 0.03)",
              }}
            >
              <ThemedLabel className="mb-3">
                Possibly Forgotten
              </ThemedLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {forgotten.map((r) => (
                  <div
                    key={r.merchant}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: theme.bodyFont,
                        color: theme.text,
                        fontSize: "13px",
                      }}
                    >
                      {r.merchant}
                    </span>
                    <span
                      style={{
                        fontFamily: theme.bodyFont,
                        color: theme.danger,
                        fontSize: "12px",
                      }}
                    >
                      Last charged {r.last_gap_days} days ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealPanel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// FORECAST TAB
// ═══════════════════════════════════════════

function ForecastTab({
  data,
  budgetProgress,
  onCategoryClick,
}: {
  data: ForecastData;
  budgetProgress?: BudgetProgress[];
  onCategoryClick: (category: string) => void;
}) {
  const { theme } = useTheme();

  const projected = data.projections.recommended;
  const avgMonthly = data.vs_average.avg_monthly;
  const diff = projected - avgMonthly;
  const diffPct = data.vs_average.projected_diff_pct ?? 0;
  const diffColor =
    diff > 0 ? theme.danger : diff < 0 ? theme.success : theme.textMuted;

  const sortedCategories = useMemo(
    () =>
      [...data.category_forecasts].sort(
        (a, b) => b.projected - a.projected
      ),
    [data.category_forecasts]
  );

  const budgetMap = useMemo(
    () => new Map((budgetProgress ?? []).map((bp) => [bp.category, bp])),
    [budgetProgress]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Month Projection */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Month Projection</ThemedLabel>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "16px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: theme.displayFont,
                fontSize: "36px",
                fontWeight: theme.headingWeight,
                fontStyle: theme.headingItalic ? "italic" : "normal",
                color: theme.text,
                lineHeight: 1,
              }}
            >
              {formatCurrency(projected)}
            </span>
            <span
              style={{
                fontFamily: theme.bodyFont,
                fontSize: "14px",
                color: theme.textMuted,
              }}
            >
              vs avg {formatCurrency(avgMonthly)}
            </span>
            <span
              style={{
                fontFamily: theme.bodyFont,
                fontSize: "14px",
                fontWeight: 600,
                color: diffColor,
              }}
            >
              {diff > 0 ? "+" : ""}
              {diffPct.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: "12px" }}>
            <ProportionBar
              value={data.current_month.spent_so_far}
              max={projected > 0 ? projected : 1}
              color={theme.accent}
              bgColor={
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)"
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: theme.bodyFont,
              fontSize: "12px",
              color: theme.textMuted,
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span>
              {formatCurrency(data.current_month.spent_so_far)} spent so far
            </span>
            <span>
              Day {data.current_month.days_elapsed} of{" "}
              {data.current_month.days_in_month} ({data.current_month.days_remaining} remaining)
            </span>
          </div>
        </ThemedPanel>
      </RevealPanel>

      {/* Category Forecasts */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Category Forecasts</ThemedLabel>
          {sortedCategories.length > 0 ? (
            <ThemedTable>
              <thead>
                <tr>
                  <ThemedTh>Category</ThemedTh>
                  <ThemedTh numeric>Spent</ThemedTh>
                  <ThemedTh numeric>Projected</ThemedTh>
                  <ThemedTh numeric>vs Avg</ThemedTh>
                  <ThemedTh>Trend</ThemedTh>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => {
                  const vsColor =
                    cat.vs_avg_pct > 10
                      ? theme.danger
                      : cat.vs_avg_pct < -10
                        ? theme.success
                        : theme.textMuted;
                  const arrow =
                    cat.trend === "up"
                      ? "\u25B2"
                      : cat.trend === "down"
                        ? "\u25BC"
                        : "\u2014";
                  const trendColor =
                    cat.trend === "up"
                      ? theme.danger
                      : cat.trend === "down"
                        ? theme.success
                        : theme.textMuted;

                  return (
                    <ThemedTr key={cat.category}>
                      <ThemedTd>
                        <button
                          onClick={() => onCategoryClick(cat.category)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: theme.text,
                            fontFamily: theme.bodyFont,
                            fontSize: "13px",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = theme.accent;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = theme.text;
                          }}
                        >
                          {cat.category}
                        </button>
                      </ThemedTd>
                      <ThemedTd numeric>
                        {formatCurrency(cat.spent_so_far)}
                      </ThemedTd>
                      <ThemedTd numeric>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <span>{formatCurrency(cat.projected)}</span>
                          {budgetMap.has(cat.category) && (() => {
                            const bp = budgetMap.get(cat.category)!;
                            const budgetColor =
                              bp.projected_pct > 100
                                ? theme.danger
                                : bp.projected_pct > 80
                                  ? theme.accent
                                  : theme.success;
                            return (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontFamily: theme.bodyFont,
                                  color: budgetColor,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {fmt(bp.projected_pct, 0)}% of budget
                              </span>
                            );
                          })()}
                        </div>
                      </ThemedTd>
                      <ThemedTd numeric>
                        <span style={{ color: vsColor }}>
                          {arrow}{" "}
                          {fmt(Math.abs(cat.vs_avg_pct ?? 0), 0)}%
                        </span>
                      </ThemedTd>
                      <ThemedTd>
                        <ThemedBadge color={trendColor}>
                          {cat.trend}
                        </ThemedBadge>
                      </ThemedTd>
                    </ThemedTr>
                  );
                })}
              </tbody>
            </ThemedTable>
          ) : (
            <p
              style={{
                fontFamily: theme.bodyFont,
                color: theme.textMuted,
                fontSize: "13px",
              }}
            >
              Not enough data for category forecasts.
            </p>
          )}
        </ThemedPanel>
      </RevealPanel>

      {/* Projection Methods */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Projection Methods</ThemedLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            {(
              [
                ["Linear", data.projections.linear],
                ["Day-Weighted", data.projections.day_weighted],
                ["EWMA", data.projections.ewma],
                ["Recommended", data.projections.recommended],
              ] as const
            ).map(([label, value]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: theme.labelColor,
                    fontFamily: theme.bodyFont,
                    marginBottom: "4px",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: label === "Recommended" ? 700 : 500,
                    fontSize: "15px",
                    color:
                      label === "Recommended"
                        ? theme.accent
                        : theme.text,
                  }}
                >
                  {formatCurrency(value)}
                </p>
              </div>
            ))}
          </div>
        </ThemedPanel>
      </RevealPanel>
    </div>
  );
}

// ═══════════════════════════════════════════
// YEAR-OVER-YEAR TAB
// ═══════════════════════════════════════════

function YearOverYearTab({ monthly }: { monthly: MonthlyData }) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();

  const yoyData = useMemo(() => {
    const years = new Set<string>();
    const byMonth: Record<string, Record<string, number>> = {};

    for (const m of monthly.monthly) {
      const [year, monthNum] = m.month.split("-");
      years.add(year);
      const monthName = new Date(2000, parseInt(monthNum) - 1).toLocaleString(
        "default",
        { month: "short" }
      );
      if (!byMonth[monthName]) byMonth[monthName] = {};
      byMonth[monthName][year] = m.total;
    }

    const monthOrder = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return {
      data: monthOrder
        .filter((m) => byMonth[m])
        .map((m) => ({ month: m, ...byMonth[m] })),
      years: Array.from(years).sort(),
    };
  }, [monthly]);

  // Calculate year-over-year totals for summary stats
  const yearTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const m of monthly.monthly) {
      const year = m.month.split("-")[0];
      totals[year] = (totals[year] || 0) + m.total;
    }
    return yoyData.years.map((y) => ({ year: y, total: totals[y] || 0 }));
  }, [monthly, yoyData.years]);

  if (yoyData.years.length < 2) {
    return (
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedEmptyState
            variant="analytics"
            title="Not enough data"
            description="Year-over-year comparison requires at least 2 years of transaction data."
          />
        </ThemedPanel>
      </RevealPanel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Year totals summary */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Annual Totals</ThemedLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(yearTotals.length, 4)}, 1fr)`,
              gap: "16px",
            }}
          >
            {yearTotals.map((yt, i) => (
              <ThemedStat
                key={yt.year}
                label={yt.year}
                value={formatCurrency(yt.total)}
                subValue={
                  i > 0 && yearTotals[i - 1].total > 0
                    ? `${((yt.total / yearTotals[i - 1].total - 1) * 100).toFixed(1)}% vs ${yearTotals[i - 1].year}`
                    : undefined
                }
                trend={
                  i > 0
                    ? yt.total > yearTotals[i - 1].total
                      ? "up"
                      : "down"
                    : undefined
                }
              />
            ))}
          </div>
        </ThemedPanel>
      </RevealPanel>

      {/* Grouped bar chart */}
      <RevealPanel>
        <ThemedPanel className="p-5">
          <ThemedLabel className="mb-3">Monthly Comparison</ThemedLabel>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData.data} barCategoryGap="15%">
                <CartesianGrid
                  stroke={theme.gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme.axisColor, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v?: number) =>
                    v != null ? `$${(v / 1000).toFixed(1)}k` : ""
                  }
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v?: number) =>
                    v != null ? [formatCurrency(v)] : []
                  }
                />
                <Legend
                  wrapperStyle={{
                    fontFamily: theme.bodyFont,
                    fontSize: "12px",
                  }}
                />
                {yoyData.years.map((year, i) => (
                  <Bar
                    key={year}
                    dataKey={year}
                    fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ThemedPanel>
      </RevealPanel>
    </div>
  );
}

// ═══════════════════════════════════════════
// CATEGORY DEEP DIVE MODAL
// ═══════════════════════════════════════════

function CategoryDeepDiveModal({
  category,
  data,
  loading,
  onClose,
}: {
  category: string;
  data: CategoryDeepDive | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle();
  const gradientId = useChartGradientId("category-dd");

  const categoryColor = CATEGORY_COLORS[category] || theme.accent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.panelRadius,
          maxWidth: "768px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: theme.displayFont,
                fontWeight: theme.headingWeight,
                fontSize: "20px",
                color: theme.text,
                margin: 0,
              }}
            >
              {category}
            </h2>
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: "13px",
                color: theme.textMuted,
                margin: "4px 0 0",
              }}
            >
              Category deep dive
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.textMuted,
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = theme.textMuted;
            }}
          >
            &#x2715;
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <ThemedSkeleton variant="heading" />
            <ThemedSkeleton variant="chart" />
            <ThemedSkeleton variant="card" />
          </div>
        ) : data ? (
          <>
            {/* Summary stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {[
                { label: "Total Spent", value: formatCurrency(data.total_spent) },
                { label: "Transactions", value: data.transaction_count.toString() },
                { label: "Avg Amount", value: formatCurrency(data.avg_amount) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: theme.labelColor,
                      fontFamily: theme.bodyFont,
                      margin: "0 0 4px",
                    }}
                  >
                    {stat.label}
                  </p>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                      fontSize: "20px",
                      color: theme.text,
                      margin: 0,
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Monthly trend */}
            {data.monthly_trend.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <ThemedLabel className="mb-3">Monthly Trend</ThemedLabel>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly_trend}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={categoryColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={categoryColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={theme.gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: theme.axisColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(m: string) => {
                          const parts = m.split("-");
                          return new Date(2000, parseInt(parts[1]) - 1).toLocaleString("default", { month: "short" });
                        }}
                      />
                      <YAxis
                        tick={{ fill: theme.axisColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v?: number) => v != null ? `$${v}` : ""}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v?: number) => v != null ? [formatCurrency(v), "Total"] : []}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={categoryColor}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top merchants */}
            {data.top_merchants.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <ThemedLabel className="mb-3">Top Merchants</ThemedLabel>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.top_merchants.map((m, i) => (
                    <div
                      key={m.merchant}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: i < data.top_merchants.length - 1 ? `1px solid ${theme.border}` : "none",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.textMuted,
                            fontSize: "13px",
                            marginRight: "8px",
                          }}
                        >
                          {i + 1}.
                        </span>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.text,
                            fontSize: "13px",
                          }}
                        >
                          {m.merchant}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 500,
                            fontSize: "13px",
                            color: theme.text,
                          }}
                        >
                          {formatCurrency(m.total)}
                        </span>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.textMuted,
                            fontSize: "11px",
                            marginLeft: "8px",
                          }}
                        >
                          ({m.count} txns)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-of-week pattern */}
            {data.day_of_week.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <ThemedLabel className="mb-3">Day-of-Week Pattern</ThemedLabel>
                <div style={{ width: "100%", height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.day_of_week.sort((a, b) => a.day_num - b.day_num)}>
                      <CartesianGrid stroke={theme.gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: theme.axisColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(d: string) => d.slice(0, 3)}
                      />
                      <YAxis
                        tick={{ fill: theme.axisColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v?: number) => v != null ? `$${v}` : ""}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v?: number) => v != null ? [formatCurrency(v), "Total"] : []}
                      />
                      <Bar dataKey="total" fill={categoryColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent transactions */}
            {data.recent_transactions.length > 0 && (
              <div>
                <ThemedLabel className="mb-3">Recent Transactions</ThemedLabel>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.recent_transactions.map((txn, i) => (
                    <div
                      key={txn.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom:
                          i < data.recent_transactions.length - 1
                            ? `1px solid ${theme.border}`
                            : "none",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.textMuted,
                          }}
                        >
                          {formatDate(txn.date)}
                        </span>
                        <span
                          style={{
                            fontFamily: theme.bodyFont,
                            color: theme.text,
                            marginLeft: "12px",
                          }}
                        >
                          {txn.description}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: theme.bodyFont,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 500,
                          color: theme.text,
                        }}
                      >
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              fontFamily: theme.bodyFont,
              color: theme.textMuted,
              fontSize: "13px",
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No data available for this category.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

const VALID_TABS: TabId[] = ["habits", "patterns", "subscriptions", "forecast", "yoy"];

function AnalyticsPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>("habits");
  const initializedRef = useRef(false);

  // Data states
  const [habits, setHabits] = useState<HabitAnalysis | null>(null);
  const [patterns, setPatterns] = useState<PatternData | null>(null);
  const [daily, setDaily] = useState<DailySpending[] | null>(null);
  const [recurring, setRecurring] = useState<{
    recurring: RecurringTransaction[];
    total_monthly_recurring: number;
    total_annual_recurring: number;
  } | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);

  // Category deep dive state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryDeepDive | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Category deep dive handler
  const openCategoryDeepDive = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setCategoryLoading(true);
    setCategoryData(null);
    try {
      const res = await getCategoryDeepDive(category);
      setCategoryData(res.data);
    } catch {
      // Keep modal open but show no data
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const closeCategoryDeepDive = useCallback(() => {
    setSelectedCategory(null);
    setCategoryData(null);
  }, []);

  // Parse URL params on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlTab = searchParams.get("tab");
    const urlCategory = searchParams.get("category");

    if (urlTab && VALID_TABS.includes(urlTab as TabId)) {
      setActiveTab(urlTab as TabId);
    }
    if (urlCategory) {
      // Will open deep dive after data loads
      openCategoryDeepDive(urlCategory);
    }
  }, [searchParams, openCategoryDeepDive]);

  // Fetch data for active tab
  const fetchTabData = useCallback(async (tab: TabId) => {
    setLoading(true);
    setError(false);

    try {
      switch (tab) {
        case "habits": {
          if (!habits) {
            const res = await getHabits();
            setHabits(res.data);
          }
          break;
        }
        case "patterns": {
          if (!patterns || !daily) {
            const [pRes, dRes] = await Promise.all([
              getPatterns(),
              getDaily(),
            ]);
            setPatterns(pRes.data);
            setDaily(dRes.data);
          }
          break;
        }
        case "subscriptions": {
          if (!recurring) {
            const res = await getRecurring();
            setRecurring(res.data);
          }
          break;
        }
        case "forecast": {
          // Always refresh forecast since it's time-sensitive
          const [fRes, bpRes] = await Promise.all([
            getForecast(),
            getBudgetProgress().catch(() => ({ data: [] as BudgetProgress[] })),
          ]);
          setForecast(fRes.data);
          setBudgetProgress(bpRes.data);
          break;
        }
        case "yoy": {
          if (!monthly) {
            const res = await getMonthly();
            setMonthly(res.data);
          }
          break;
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [habits, patterns, daily, recurring, monthly]);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  // Render tab content
  function renderContent() {
    if (loading) {
      return <TabSkeleton />;
    }

    if (error) {
      return (
        <ThemedEmptyState
          variant="analytics"
          title="Unable to load analytics"
          description="Make sure the backend is running and you have imported some transactions."
          action={{ label: "Import Data", href: "/import" }}
        />
      );
    }

    switch (activeTab) {
      case "habits":
        return habits ? (
          <HabitsTab data={habits} onCategoryClick={openCategoryDeepDive} />
        ) : (
          <TabSkeleton />
        );
      case "patterns":
        return patterns && daily ? (
          <PatternsTab patterns={patterns} daily={daily} />
        ) : (
          <TabSkeleton />
        );
      case "subscriptions":
        return recurring ? (
          <SubscriptionsTab
            recurring={recurring.recurring}
            totalMonthly={recurring.total_monthly_recurring}
            totalAnnual={recurring.total_annual_recurring}
          />
        ) : (
          <TabSkeleton />
        );
      case "forecast":
        return forecast ? (
          <ForecastTab data={forecast} budgetProgress={budgetProgress} onCategoryClick={openCategoryDeepDive} />
        ) : (
          <TabSkeleton />
        );
      case "yoy":
        return monthly ? (
          <YearOverYearTab monthly={monthly} />
        ) : (
          <TabSkeleton />
        );
      default:
        return null;
    }
  }

  return (
    <PageShell
      title="Analytics"
      description="Spending habits, patterns, subscriptions, and forecasts."
    >
      <div style={{ marginBottom: "24px" }}>
        <TabSelector active={activeTab} onChange={handleTabChange} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Category Deep Dive Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <CategoryDeepDiveModal
            category={selectedCategory}
            data={categoryData}
            loading={categoryLoading}
            onClose={closeCategoryDeepDive}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsPageInner />
    </Suspense>
  );
}
