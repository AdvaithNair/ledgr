"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { formatCurrency, cn } from "@/lib/utils";
import {
  getHabits,
  getPatterns,
  getDaily,
  getRecurring,
  getForecast,
} from "@/lib/api";
import type {
  HabitAnalysis,
  PatternData,
  DailySpending,
  RecurringTransaction,
  ForecastData,
} from "@/types";

// ── Types ──

type TabId = "habits" | "patterns" | "subscriptions" | "forecast";

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "habits", label: "Habits" },
  { id: "patterns", label: "Patterns" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "forecast", label: "Forecast" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function HabitsTab({ data }: { data: HabitAnalysis }) {
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

              // Build sparkline data from monthly_totals (last 3 months)
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
                  }}
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
                    {Math.abs(cat.three_month_change_pct).toFixed(0)}%
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
                {data.merchant_concentration.top_merchant_pct.toFixed(1)}%
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
              {data.merchant_concentration.top_3_pct.toFixed(1)}%
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

  // 90-day heatmap
  const heatmapData = useMemo(() => {
    if (!daily || daily.length === 0) return null;

    // Sort daily data by date
    const sorted = [...daily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Take last 91 days
    const last90 = sorted.slice(-91);
    if (last90.length === 0) return null;

    // Build lookup
    const lookup = new Map<string, number>();
    let maxSpend = 0;
    for (const d of last90) {
      lookup.set(d.date, d.total);
      if (d.total > maxSpend) maxSpend = d.total;
    }

    // Build grid: find start date, align to Monday
    const startDate = new Date(last90[0].date);
    const endDate = new Date(last90[last90.length - 1].date);

    // Adjust start to previous Monday
    const startDow = startDate.getDay(); // 0=Sun
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() + mondayOffset);

    // Build weeks
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
        // Determine month label: show if first week or month changes
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

      {/* 90-Day Heatmap */}
      {heatmapData && (
        <RevealPanel>
          <ThemedPanel className="p-5">
            <ThemedLabel className="mb-3">90-Day Heatmap</ThemedLabel>
            <HeatmapGrid
              weeks={heatmapData.weeks}
              maxSpend={heatmapData.maxSpend}
            />
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

                // Interpolate: surface (0) to accent (max)
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

function ForecastTab({ data }: { data: ForecastData }) {
  const { theme } = useTheme();

  const projected = data.projections.recommended;
  const avgMonthly = data.vs_average.avg_monthly;
  const diff = projected - avgMonthly;
  const diffPct = data.vs_average.projected_change_pct;
  const diffColor =
    diff > 0 ? theme.danger : diff < 0 ? theme.success : theme.textMuted;

  const sortedCategories = useMemo(
    () =>
      [...data.category_forecasts].sort(
        (a, b) => b.projected - a.projected
      ),
    [data.category_forecasts]
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
                      <ThemedTd>{cat.category}</ThemedTd>
                      <ThemedTd numeric>
                        {formatCurrency(cat.spent_so_far)}
                      </ThemedTd>
                      <ThemedTd numeric>
                        {formatCurrency(cat.projected)}
                      </ThemedTd>
                      <ThemedTd numeric>
                        <span style={{ color: vsColor }}>
                          {arrow}{" "}
                          {Math.abs(cat.vs_avg_pct).toFixed(0)}%
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
// MAIN PAGE
// ═══════════════════════════════════════════

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("habits");

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

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          const res = await getForecast();
          setForecast(res.data);
          break;
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [habits, patterns, daily, recurring]);

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
        return habits ? <HabitsTab data={habits} /> : <TabSkeleton />;
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
        return forecast ? <ForecastTab data={forecast} /> : <TabSkeleton />;
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
    </PageShell>
  );
}
