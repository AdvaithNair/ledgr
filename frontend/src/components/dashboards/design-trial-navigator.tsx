"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  const { style, mode, setStyle, setMode } = useTheme();

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2 py-1.5 backdrop-blur">
        {/* Layout selector */}
        <span className="px-2 text-xs text-white/30">Layout:</span>
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
                "rounded-full px-3 py-1 text-xs transition-colors whitespace-nowrap",
                isActive && isMeridian
                  ? "bg-sky-400/20 font-medium text-sky-300 border border-sky-400/30"
                  : isActive
                    ? "bg-white font-medium text-black"
                    : isMeridian
                      ? "text-sky-300/60 hover:bg-sky-400/10 hover:text-sky-200"
                      : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {isMeridian ? layout.name : `${layout.id}. ${layout.name}`}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* Style toggle — Arctic / Paper */}
        <div
          className="relative flex items-center rounded-full border border-white/10 p-0.5"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={() => setStyle("arctic")}
            className={cn(
              "relative z-10 rounded-full px-2.5 py-1 text-xs transition-colors",
              style === "arctic"
                ? "text-white font-medium"
                : "text-white/40 hover:text-white/60"
            )}
          >
            Arctic
          </button>
          <button
            onClick={() => setStyle("paper")}
            className={cn(
              "relative z-10 rounded-full px-2.5 py-1 text-xs transition-colors",
              style === "paper"
                ? "text-white font-medium"
                : "text-white/40 hover:text-white/60"
            )}
          >
            Paper
          </button>
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded-full"
            style={{
              backgroundColor:
                style === "arctic"
                  ? "rgba(125, 211, 252, 0.25)"
                  : "rgba(5, 150, 105, 0.25)",
              border:
                style === "arctic"
                  ? "1px solid rgba(125, 211, 252, 0.3)"
                  : "1px solid rgba(5, 150, 105, 0.3)",
            }}
            animate={{
              left: style === "arctic" ? "2px" : "50%",
              width: style === "arctic" ? "50%" : "48%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        </div>

        {/* Dark / Light mode toggle */}
        <button
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          className="relative flex h-7 w-[52px] items-center rounded-full p-0.5 transition-colors duration-300"
          style={{
            backgroundColor:
              mode === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.08)",
            border:
              mode === "dark"
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(0, 0, 0, 0.1)",
          }}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <motion.div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              backgroundColor: mode === "dark" ? "#374151" : "#FBBF24",
            }}
            animate={{ x: mode === "dark" ? 1 : 23 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {mode === "dark" ? (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                  d="M14 9.34A6.5 6.5 0 016.66 2 7 7 0 1014 9.34z"
                  stroke="#E5E7EB"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06M11 8a3 3 0 11-6 0 3 3 0 016 0z"
                  stroke="#92400E"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </motion.div>
        </button>

        {/* Test Data toggle */}
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
