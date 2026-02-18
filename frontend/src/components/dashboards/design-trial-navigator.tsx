"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface DesignTrialNavigatorProps {
  currentLayout: 0 | 1 | 2 | 3 | 4 | 5;
  useTestData?: boolean;
  onToggleTestData?: () => void;
}

const LAYOUTS = [
  { id: 0, name: "Meridian", desc: "The definitive layout", href: "/" },
  { id: 1, name: "Zen Flow", desc: "Single column, progressive disclosure", href: "/1" },
  { id: 2, name: "Command Deck", desc: "Dense grid, everything visible", href: "/2" },
  { id: 3, name: "Daily Journal", desc: "Timeline narrative, scrolling story", href: "/3" },
  { id: 4, name: "Mosaic", desc: "Bento grid, visual density with breathing room", href: "/4" },
  { id: 5, name: "Pulse", desc: "Card stack, swipeable metric cards", href: "/5" },
] as const;

export function DesignTrialNavigator({
  currentLayout,
  useTestData,
  onToggleTestData,
}: DesignTrialNavigatorProps) {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div
        className="flex items-center gap-1 rounded-full px-2 py-1.5 backdrop-blur"
        style={{
          backgroundColor:
            theme.mode === "dark"
              ? "rgba(20, 20, 25, 0.92)"
              : "rgba(255, 255, 255, 0.92)",
          border: `1px solid ${theme.border}`,
        }}
      >
        {/* Layout selector */}
        <span
          className="px-2 text-xs"
          style={{ color: theme.textMuted }}
        >
          Layout:
        </span>
        {LAYOUTS.map((layout) => {
          const isActive =
            currentLayout === layout.id ||
            pathname === layout.href ||
            (layout.id !== 0 && pathname === `/${layout.id}`);
          const isMeridian = layout.id === 0;
          return (
            <Link
              key={layout.id}
              href={layout.href}
              title={layout.desc}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors whitespace-nowrap"
              )}
              style={
                isActive && isMeridian
                  ? {
                      backgroundColor: theme.accentMuted,
                      color: theme.accent,
                      fontWeight: 500,
                      border: `1px solid ${theme.mode === "dark" ? "rgba(125,211,252,0.3)" : "rgba(2,132,199,0.3)"}`,
                    }
                  : isActive
                    ? {
                        backgroundColor: theme.mode === "dark" ? "#fff" : "#000",
                        color: theme.mode === "dark" ? "#000" : "#fff",
                        fontWeight: 500,
                      }
                    : isMeridian
                      ? { color: `${theme.accent}99` }
                      : { color: theme.textMuted }
              }
            >
              {isMeridian ? layout.name : `${layout.id}. ${layout.name}`}
            </Link>
          );
        })}

        {/* Test Data toggle */}
        {onToggleTestData && (
          <>
            <div
              className="mx-1 h-4 w-px"
              style={{ backgroundColor: theme.border }}
            />
            <button
              onClick={onToggleTestData}
              className="rounded-full px-3 py-1 text-xs transition-colors"
              style={
                useTestData
                  ? {
                      backgroundColor: "rgba(245, 158, 11, 0.2)",
                      color: "#FBBF24",
                      fontWeight: 500,
                    }
                  : { color: theme.textMuted }
              }
            >
              {useTestData ? "Test Data ON" : "Test Data"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
