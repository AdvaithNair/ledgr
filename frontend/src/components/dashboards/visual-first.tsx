"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Treemap,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getCardColor, CATEGORY_COLORS } from "@/lib/constants";
import type {
  EnhancedSummaryStats,
  MonthlyData,
  Card as CardType,
  ForecastData,
  DailySpending,
} from "@/types";

interface VisualFirstProps {
  summary: EnhancedSummaryStats;
  monthly: MonthlyData | null;
  cards: CardType[];
  forecast: ForecastData | null;
  daily: DailySpending[] | null;
}

const customTooltipStyle = {
  backgroundColor: "#141419",
  border: "1px solid #1E1E26",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

// Calendar Heatmap Component
function CalendarHeatmap({ daily }: { daily: DailySpending[] }) {
  const last90 = daily.slice(-90);
  const maxVal = Math.max(...last90.map((d) => d.total), 1);

  function getColor(val: number): string {
    const ratio = val / maxVal;
    if (ratio === 0) return "#1E1E26";
    if (ratio < 0.33) return "#10B981";
    if (ratio < 0.66) return "#F59E0B";
    return "#EF4444";
  }

  // Group by week
  const weeks: DailySpending[][] = [];
  let currentWeek: DailySpending[] = [];
  for (let i = 0; i < last90.length; i++) {
    const dayOfWeek = new Date(last90[i].date + "T00:00:00").getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(last90[i]);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="flex gap-[3px]">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <motion.div
              key={day.date}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (wi * 7 + di) * 0.01 }}
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: getColor(day.total),
                opacity: day.total === 0 ? 0.3 : 0.5 + (day.total / maxVal) * 0.5,
              }}
              title={`${day.date}: ${formatCurrency(day.total)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Custom Treemap content
function TreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  color?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, value, color } = props;
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color || "#6B7280"}
        fillOpacity={0.6}
        stroke="#0A0A0F"
        strokeWidth={2}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={500}
      >
        {name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="#ffffff80"
        fontSize={10}
        fontFamily="monospace"
      >
        {value ? formatCurrency(value) : ""}
      </text>
    </g>
  );
}

export function VisualFirst({
  summary,
  monthly,
  cards,
  forecast,
  daily,
}: VisualFirstProps) {
  // Pie chart data
  const pieData = summary.by_card?.map((c) => ({
    name: c.card,
    value: c.total,
    color: getCardColor(cards, c.card),
  })) ?? [];

  // Treemap data
  const treemapData = summary.by_category?.map((cat) => {
    const catForecast = forecast?.category_forecasts?.find(
      (f) => f.category === cat.category
    );
    return {
      name: cat.category,
      size: cat.total,
      color: CATEGORY_COLORS[cat.category] ?? "#6B7280",
      trend: catForecast?.trend,
    };
  }) ?? [];

  // Waterfall data (month-over-month category changes)
  const waterfallData = useMemo(() => {
    if (!monthly?.monthly_by_category || monthly.monthly_by_category.length === 0)
      return [];

    const months = [...new Set(monthly.monthly_by_category.map((m) => m.month))].sort();
    if (months.length < 2) return [];

    const lastMonth = months[months.length - 2];
    const thisMonth = months[months.length - 1];

    const lastData = new Map(
      monthly.monthly_by_category
        .filter((m) => m.month === lastMonth)
        .map((m) => [m.category, m.total])
    );
    const thisData = new Map(
      monthly.monthly_by_category
        .filter((m) => m.month === thisMonth)
        .map((m) => [m.category, m.total])
    );

    const categories = [
      ...new Set([...lastData.keys(), ...thisData.keys()]),
    ];
    return categories
      .map((cat) => ({
        category: cat,
        delta: (thisData.get(cat) ?? 0) - (lastData.get(cat) ?? 0),
        color: CATEGORY_COLORS[cat] ?? "#6B7280",
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [monthly]);

  // Bump chart (category rankings over time)
  const bumpData = useMemo(() => {
    if (!monthly?.monthly_by_category) return [];

    const months = [
      ...new Set(monthly.monthly_by_category.map((m) => m.month)),
    ].sort();
    const last6 = months.slice(-6);

    return last6.map((month) => {
      const entries = monthly.monthly_by_category
        .filter((m) => m.month === month)
        .sort((a, b) => b.total - a.total);

      const ranked: Record<string, number> = {};
      entries.forEach((e, i) => {
        ranked[e.category] = i + 1;
      });
      return { month: month.slice(5), ...ranked };
    });
  }, [monthly]);

  const bumpCategories = useMemo(() => {
    if (!monthly?.monthly_by_category) return [];
    return [
      ...new Set(monthly.monthly_by_category.map((m) => m.category)),
    ].slice(0, 5);
  }, [monthly]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <span className="font-mono text-lg text-white">
          {formatCurrency(summary.this_month)}{" "}
          <span className="text-sm text-white/40">this mo.</span>
        </span>
      </div>

      {/* Calendar Heatmap */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0 }}
      >
        <Card padding="sm">
          <p className="mb-3 text-[10px] uppercase text-white/40">
            Daily Spending (90 days)
          </p>
          <div className="flex items-end gap-4">
            <CalendarHeatmap daily={daily ?? []} />
            <div className="flex flex-col gap-1 text-[9px] text-white/30">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-[#1E1E26]" /> $0
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-[#10B981]" /> Low
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-[#F59E0B]" /> Med
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-[#EF4444]" /> High
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Middle row: Pie + Treemap */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card padding="sm">
            <p className="mb-2 text-[10px] uppercase text-white/40">
              Spend by Card
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(v?: number) => formatCurrency(v ?? 0)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-white/50">{d.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card padding="sm">
            <p className="mb-2 text-[10px] uppercase text-white/40">
              Category Breakdown
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="none"
                animationDuration={800}
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Waterfall */}
      {waterfallData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card padding="sm">
            <p className="mb-2 text-[10px] uppercase text-white/40">
              Month-over-Month Changes
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={waterfallData}>
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "#ffffff40" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(v?: number) =>
                    `${(v ?? 0) >= 0 ? "+" : ""}${formatCurrency(v ?? 0)}`
                  }
                />
                <Bar dataKey="delta" radius={[4, 4, 0, 0]} animationDuration={800}>
                  {waterfallData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.delta >= 0 ? "#EF4444" : "#10B981"}
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Bump Chart */}
      {bumpData.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Card padding="sm">
            <p className="mb-2 text-[10px] uppercase text-white/40">
              Category Rankings Over Time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bumpData}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#ffffff40" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  reversed
                  domain={[1, 5]}
                  tick={{ fontSize: 10, fill: "#ffffff30" }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip contentStyle={customTooltipStyle} />
                {bumpCategories.map((cat) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={CATEGORY_COLORS[cat] ?? "#6B7280"}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    animationDuration={1200}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {bumpCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 text-[10px]">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280",
                    }}
                  />
                  <span className="text-white/50">{cat}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <p className="text-center text-xs text-white/20">
        Hover any chart for details
      </p>
    </div>
  );
}
