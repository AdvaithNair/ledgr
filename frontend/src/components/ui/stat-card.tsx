import { cn } from "@/lib/utils";
import { Card } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const trendColors = {
  up: "text-red-400",
  down: "text-emerald-400",
  neutral: "text-white/40",
};

const trendIcons = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export function StatCard({
  label,
  value,
  subValue,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card padding="sm" className={className}>
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-white">
        {value}
      </p>
      {(subValue || trend) && (
        <p className={cn("mt-1 text-xs", trend ? trendColors[trend] : "text-white/40")}>
          {trend && <span className="mr-1">{trendIcons[trend]}</span>}
          {subValue}
        </p>
      )}
    </Card>
  );
}
