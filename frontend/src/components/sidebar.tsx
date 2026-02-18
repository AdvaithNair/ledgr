"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeStyle, type ThemeMode } from "@/components/theme-provider";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    matchPaths: ["/"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="7" height="7" rx="1" />
        <rect x="10" y="1" width="7" height="7" rx="1" />
        <rect x="1" y="10" width="7" height="7" rx="1" />
        <rect x="10" y="10" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Import",
    href: "/import",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2v10m0 0l-3-3m3 3l3-3M3 13v2h12v-2" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h14M2 9h14M2 14h10" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 16V10h3v6H2zM7.5 16V6h3v10h-3zM13 16V2h3v14h-3z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="3" />
        <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.41 1.41M13.54 13.54l1.41 1.41M3.05 14.95l1.41-1.41M13.54 4.46l1.41-1.41" />
      </svg>
    ),
  },
];

const THEME_CYCLE: { style: ThemeStyle; mode: ThemeMode }[] = [
  { style: "arctic", mode: "dark" },
  { style: "arctic", mode: "light" },
  { style: "paper", mode: "dark" },
  { style: "paper", mode: "light" },
];

function getThemeLabel(style: ThemeStyle, mode: ThemeMode): string {
  const styleName = style === "arctic" ? "Arctic" : "Paper";
  const modeName = mode === "dark" ? "Dark" : "Light";
  return `${styleName} ${modeName}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, style, mode, setStyle, setMode } = useTheme();

  function isActive(item: (typeof navItems)[0]) {
    if (item.matchPaths) return item.matchPaths.some((p) => pathname === p);
    return pathname === item.href;
  }

  function cycleTheme() {
    const currentIndex = THEME_CYCLE.findIndex(
      (t) => t.style === style && t.mode === mode
    );
    const next = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
    setStyle(next.style);
    setMode(next.mode);
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex h-screen flex-col overflow-hidden"
      style={{
        backgroundColor: theme.bg,
        borderRight: `1px solid ${theme.border}`,
        fontFamily: theme.bodyFont,
      }}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-14 items-center justify-between px-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                href="/"
                className="text-lg font-bold"
                style={{ color: theme.text, fontFamily: theme.displayFont }}
              >
                Ledgr
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {collapsed ? (
              <path d="M6 3l5 5-5 5" />
            ) : (
              <path d="M10 3L5 8l5 5" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              )}
              style={{
                backgroundColor: active ? theme.accentMuted : "transparent",
                color: active ? theme.accent : theme.textMuted,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = theme.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = theme.textMuted;
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom — theme indicator + cycle */}
      <div
        className="p-3"
        style={{ borderTop: `1px solid ${theme.border}` }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            <button
              onClick={cycleTheme}
              className="rounded p-1 transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
              title="Cycle theme"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 8a7 7 0 0 1 13-3.5M15 8a7 7 0 0 1-13 3.5" />
                <path d="M14 1v3.5h-3.5M2 15v-3.5h3.5" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={cycleTheme}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            title="Cycle theme"
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            <span className="flex-1 text-left whitespace-nowrap">
              {getThemeLabel(style, mode)}
            </span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8a7 7 0 0 1 13-3.5M15 8a7 7 0 0 1-13 3.5" />
              <path d="M14 1v3.5h-3.5M2 15v-3.5h3.5" />
            </svg>
          </button>
        )}
      </div>
    </motion.aside>
  );
}
