"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DesignTrialNavigatorProps {
  currentTrial: 1 | 2 | 3 | 4 | 5;
}

const TRIALS = [
  { id: 1, name: "Command Center", desc: "Dense data grid" },
  { id: 2, name: "Zen Minimalist", desc: "Focus & calm" },
  { id: 3, name: "Story Mode", desc: "Narrative finance" },
  { id: 4, name: "Action Dashboard", desc: "Task-oriented" },
  { id: 5, name: "Visual First", desc: "Chart gallery" },
] as const;

export function DesignTrialNavigator({ currentTrial }: DesignTrialNavigatorProps) {
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
      </div>
    </div>
  );
}
