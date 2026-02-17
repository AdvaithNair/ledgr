"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type {
  EnhancedSummaryStats,
  ForecastData,
  CategoryAnomaly,
  HabitAnalysis,
  RecurringTransaction,
} from "@/types";

interface ActionDashboardProps {
  summary: EnhancedSummaryStats;
  forecast: ForecastData | null;
  anomalies: CategoryAnomaly[];
  habits: HabitAnalysis | null;
  recurring: RecurringTransaction[] | null;
}

interface ActionItem {
  id: string;
  label: string;
  detail: string;
  defaultChecked: boolean;
}

function buildActionItems(
  anomalies: CategoryAnomaly[],
  habits: HabitAnalysis | null,
  recurring: RecurringTransaction[] | null
): ActionItem[] {
  const items: ActionItem[] = [
    {
      id: "monthly-review",
      label: "Monthly review complete",
      detail: "View report",
      defaultChecked: false,
    },
    {
      id: "recurring-verified",
      label: "Recurring charges verified",
      detail: `${recurring?.filter((r) => r.status === "active").length ?? 0} items`,
      defaultChecked: false,
    },
  ];

  for (const a of anomalies.filter(
    (a) => a.severity === "high" || a.severity === "critical"
  )) {
    items.push({
      id: `anomaly-${a.category}`,
      label: `Address ${a.category} overspend`,
      detail: `+${formatCurrency(a.current_month - a.avg_monthly)} over avg`,
      defaultChecked: false,
    });
  }

  if (habits?.weekend_splurge && habits.weekend_splurge.ratio > 1.5) {
    items.push({
      id: "weekend",
      label: "Review weekend spending pattern",
      detail: `${((habits.weekend_splurge.ratio - 1) * 100).toFixed(0)}% higher`,
      defaultChecked: false,
    });
  }

  const forgotten = recurring?.filter((r) => r.potentially_forgotten) ?? [];
  for (const r of forgotten.slice(0, 2)) {
    items.push({
      id: `cancel-${r.merchant}`,
      label: `Cancel unused subscription?`,
      detail: `${r.merchant} idle`,
      defaultChecked: false,
    });
  }

  return items;
}

export function ActionDashboard({
  summary,
  forecast,
  anomalies,
  habits,
  recurring,
}: ActionDashboardProps) {
  const actionItems = buildActionItems(anomalies, habits, recurring);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const avgMonthly = forecast?.vs_average?.avg_monthly ?? summary.avg_monthly;
  const projected =
    forecast?.projections.recommended ?? summary.projected_month_total;
  const progress = Math.min((summary.this_month / avgMonthly) * 100, 100);
  const onTrack = projected <= avgMonthly;

  const now = new Date();
  const daysRemaining =
    forecast?.current_month?.days_remaining ??
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  // Quick wins from anomaly categories
  const quickWins = anomalies.slice(0, 2).map((a) => ({
    category: a.category,
    current: a.current_month,
    goal: a.current_month * 0.8,
    saving: a.current_month * 0.2,
  }));

  // Achievements
  const achievements: string[] = [];
  const decreasing =
    habits?.category_creep?.filter((c) => c.trend === "decreasing") ?? [];
  for (const cat of decreasing.slice(0, 2)) {
    achievements.push(
      `${cat.category} down ${Math.abs(cat.three_month_change_pct).toFixed(0)}% from last month`
    );
  }
  if (
    habits?.impulse_spending &&
    habits.impulse_spending.score < 30
  ) {
    achievements.push("Low impulse spending score");
  }
  if (recurring && recurring.every((r) => !r.potentially_forgotten)) {
    achievements.push("Recurring expenses stable");
  }

  return (
    <div className="space-y-6">
      {/* Action Items */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Action Items</h2>
          <span className="text-sm text-white/40">
            {checked.size} of {actionItems.length} done
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {actionItems.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <motion.div
                key={item.id}
                layout
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <motion.div
                    animate={{
                      backgroundColor: isChecked ? "#10B981" : "transparent",
                      borderColor: isChecked ? "#10B981" : "#ffffff30",
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex h-5 w-5 items-center justify-center rounded border"
                    onClick={() => toggle(item.id)}
                  >
                    {isChecked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </motion.div>
                  <span
                    className={
                      isChecked
                        ? "text-sm text-white/30 line-through"
                        : "text-sm text-white"
                    }
                  >
                    {item.label}
                  </span>
                </label>
                <span className="text-xs text-white/40">{item.detail}</span>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Mission */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            This Month&apos;s Mission
          </h2>
          <span className="text-sm text-white/40">
            {daysRemaining} days remaining
          </span>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Stay under {formatCurrency(avgMonthly)} (your 3-month average)
        </p>
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: onTrack ? "#10B981" : "#F59E0B",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="font-mono text-white/60">
              {formatCurrency(summary.this_month)}
            </span>
            <span className="font-mono text-white/30">
              {formatCurrency(avgMonthly)}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/40">
          Current pace:{" "}
          <span className="font-mono">
            {formatCurrency(projected)}
          </span>{" "}
          projected —{" "}
          <Badge color={onTrack ? "#10B981" : "#F59E0B"}>
            {onTrack ? "On track" : "Over pace"}
          </Badge>
        </p>
      </Card>

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">Quick Wins</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickWins.map((win) => (
              <Card
                key={win.category}
                hover
                padding="sm"
                className="transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Reduce {win.category} by 20%
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Current:{" "}
                      <span className="font-mono">
                        {formatCurrency(win.current)}
                      </span>{" "}
                      → Goal:{" "}
                      <span className="font-mono">
                        {formatCurrency(win.goal)}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-emerald-400">
                    Save {formatCurrency(win.saving)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <h2 className="text-lg font-medium text-white">
            Recent Achievements
          </h2>
          <div className="mt-3 space-y-2">
            {achievements.map((ach, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-2 text-sm text-white/60"
              >
                <span className="text-emerald-400">★</span>
                {ach}
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
