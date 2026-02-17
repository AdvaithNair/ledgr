"use client";

import type { Card, MonthlyData } from "@/types";
import { cn } from "@/lib/utils";

interface CoverageTrackerProps {
  cards: Card[];
  monthlyData: MonthlyData | null;
}

function getMonthRange(): string[] {
  const months: string[] = [];
  const now = new Date();
  const start = new Date(2025, 0, 1);
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
  const months = getMonthRange();

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
                className="w-8 text-center text-[10px] text-white/30"
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
                  className={cn(
                    "h-5 w-8 rounded-sm",
                    hasData ? "" : "bg-white/5"
                  )}
                  style={hasData ? { backgroundColor: card.color } : undefined}
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
