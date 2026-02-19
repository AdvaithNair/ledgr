"use client";

import type { Card, MonthlyData } from "@/types";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface CoverageTrackerProps {
  cards: Card[];
  monthlyData: MonthlyData | null;
}

function getMonthRange(monthlyData: MonthlyData | null): string[] {
  const months: string[] = [];
  const now = new Date();

  // Determine start from data, fallback to 12 months ago
  let start: Date;
  if (monthlyData?.monthly && monthlyData.monthly.length > 0) {
    const sorted = [...monthlyData.monthly].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const [y, m] = sorted[0].month.split("-").map(Number);
    start = new Date(y, m - 1, 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  const current = new Date(start);
  while (current <= now) {
    months.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    );
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function CoverageTracker({ cards, monthlyData }: CoverageTrackerProps) {
  const { theme } = useTheme();
  const months = getMonthRange(monthlyData);

  const coverageMap = new Map<string, Set<string>>();
  if (monthlyData?.monthly_by_card) {
    for (const entry of monthlyData.monthly_by_card) {
      const key = entry.month;
      if (!coverageMap.has(key)) coverageMap.set(key, new Set());
      coverageMap.get(key)!.add(entry.card);
    }
  }

  if (cards.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        {/* Month headers */}
        <div className="mb-1 flex gap-1 pl-24">
          {months.map((m) => {
            const monthIdx = parseInt(m.split("-")[1]) - 1;
            return (
              <div
                key={m}
                className="w-8 text-center text-[10px]"
                style={{ color: theme.textMuted }}
              >
                {MONTH_LABELS[monthIdx]}
              </div>
            );
          })}
        </div>

        {/* Card rows */}
        {cards.map((card) => (
          <div key={card.id} className="flex items-center gap-1">
            <div
              className="w-24 truncate text-xs font-medium"
              style={{ color: card.color }}
            >
              {card.label}
            </div>
            {months.map((m) => {
              const hasData = coverageMap.get(m)?.has(card.code) ?? false;
              return (
                <div
                  key={m}
                  className={cn("h-5 w-8 rounded-sm")}
                  style={
                    hasData
                      ? { backgroundColor: card.color }
                      : {
                          backgroundColor:
                            theme.mode === "dark"
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.05)",
                        }
                  }
                  title={`${card.label} — ${m}: ${hasData ? "Has data" : "No data"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
