"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DesignTrialNavigatorProps {
  currentTrial: 1 | 2 | 3 | 4 | 5;
  useTestData?: boolean;
  onToggleTestData?: () => void;
}

const TRIALS = [
  { id: 1, name: "Zen Minimalist", desc: "Monochrome calm" },
  { id: 2, name: "Warm Ledger", desc: "Amber & serif elegance" },
  { id: 3, name: "Arctic Glass", desc: "Frosted Nordic cool" },
  { id: 4, name: "Neon Dusk", desc: "Cinematic rose glow" },
  { id: 5, name: "Paper Light", desc: "Editorial light mode" },
] as const;

export function DesignTrialNavigator({ currentTrial, useTestData, onToggleTestData }: DesignTrialNavigatorProps) {
  const pathname = usePathname();

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2 py-1.5 backdrop-blur">
        <span className="px-2 text-xs text-white/30">Design Trial:</span>
        {TRIALS.map((trial) => {
          const isActive = currentTrial === trial.id || pathname === `/${trial.id}`;
          return (
            <Link
              key={trial.id}
              href={`/${trial.id}`}
              title={trial.desc}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                isActive
                  ? "bg-white font-medium text-black"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {trial.id}. {trial.name}
            </Link>
          );
        })}
        {onToggleTestData && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <button
              onClick={onToggleTestData}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                useTestData
                  ? "bg-amber-500/20 font-medium text-amber-400"
                  : "text-white/30 hover:bg-white/10 hover:text-white/60"
              )}
            >
              {useTestData ? "Test Data ON" : "Test Data"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
