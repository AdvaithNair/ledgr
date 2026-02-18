"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  useTheme,
  ARCTIC_DARK,
  ARCTIC_LIGHT,
  PAPER_DARK,
  PAPER_LIGHT,
  type ThemeStyle,
  type ThemeMode,
} from "@/components/theme-provider";

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

// ── Theme preview data ──
const THEME_OPTIONS: {
  style: ThemeStyle;
  mode: ThemeMode;
  label: string;
  config: typeof ARCTIC_DARK;
}[] = [
  { style: "arctic", mode: "dark", label: "Arctic Dark", config: ARCTIC_DARK },
  { style: "arctic", mode: "light", label: "Arctic Light", config: ARCTIC_LIGHT },
  { style: "paper", mode: "dark", label: "Paper Dark", config: PAPER_DARK },
  { style: "paper", mode: "light", label: "Paper Light", config: PAPER_LIGHT },
];

// ── Mini theme preview swatch ──
function ThemePreview({
  config,
  label,
  isActive,
  onClick,
  hostTheme,
}: {
  config: typeof ARCTIC_DARK;
  label: string;
  isActive: boolean;
  onClick: () => void;
  hostTheme: typeof ARCTIC_DARK;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 w-full"
      style={{
        backgroundColor: isActive ? hostTheme.accentMuted : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor =
            hostTheme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {/* Mini preview card */}
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-md"
        style={{
          width: 44,
          height: 30,
          backgroundColor: config.bg,
          border: `1px solid ${config.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: config.mode === "dark"
            ? "0 1px 4px rgba(0,0,0,0.4)"
            : "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {/* Tiny sidebar sliver */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 9,
            backgroundColor: config.sidebarBg,
            borderRight: `0.5px solid ${config.border}`,
          }}
        />
        {/* Nav dot */}
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 6,
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: config.accent,
          }}
        />
        {/* Tiny accent heading */}
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 5,
            width: 18,
            height: 2.5,
            borderRadius: 1,
            backgroundColor: config.accent,
          }}
        />
        {/* Tiny content lines */}
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 11,
            width: 24,
            height: 1.5,
            borderRadius: 0.5,
            backgroundColor: config.text,
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 16,
            width: 16,
            height: 1.5,
            borderRadius: 0.5,
            backgroundColor: config.text,
            opacity: 0.1,
          }}
        />
        {/* Tiny chart bar */}
        <div
          style={{
            position: "absolute",
            left: 13,
            top: 22,
            width: 8,
            height: 4,
            borderRadius: "1px 1px 0 0",
            backgroundColor: config.accent,
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 23,
            top: 20,
            width: 8,
            height: 6,
            borderRadius: "1px 1px 0 0",
            backgroundColor: config.accent,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Label + accent dot */}
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[12px] font-medium whitespace-nowrap leading-tight"
          style={{
            color: isActive ? hostTheme.accent : hostTheme.text,
          }}
        >
          {label}
        </span>
        <span
          className="text-[10px] whitespace-nowrap leading-tight"
          style={{ color: hostTheme.textMuted }}
        >
          {config.style === "arctic" ? "Frosted glass" : "Editorial"} · {config.mode === "dark" ? "Dark" : "Light"}
        </span>
      </div>

      {/* Active check */}
      {isActive && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="ml-auto flex-shrink-0"
        >
          <path
            d="M3 7.5l2.5 2.5L11 4"
            stroke={hostTheme.accent}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const { theme, style, mode, setStyle, setMode } = useTheme();
  const pickerRef = useRef<HTMLDivElement>(null);

  function isActive(item: (typeof navItems)[0]) {
    if (item.matchPaths) return item.matchPaths.some((p) => pathname === p);
    return pathname === item.href;
  }

  function selectTheme(s: ThemeStyle, m: ThemeMode) {
    setStyle(s);
    setMode(m);
    setThemePickerOpen(false);
  }

  // Close picker on outside click
  useEffect(() => {
    if (!themePickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setThemePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [themePickerOpen]);

  const themeLabel =
    (style === "arctic" ? "Arctic" : "Paper") +
    " " +
    (mode === "dark" ? "Dark" : "Light");

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex h-screen flex-col overflow-visible"
      style={{
        backgroundColor: theme.sidebarBg,
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            {collapsed ? <path d="M6 3l5 5-5 5" /> : <path d="M10 3L5 8l5 5" />}
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
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors")}
              style={{
                backgroundColor: active ? theme.accentMuted : "transparent",
                color: active ? theme.accent : theme.textMuted,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = theme.textMuted;
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

      {/* Bottom — theme picker trigger */}
      <div
        className="relative p-3"
        style={{ borderTop: `1px solid ${theme.border}` }}
        ref={pickerRef}
      >
        {/* Theme picker popup */}
        <AnimatePresence>
          {themePickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
              className="absolute z-50 overflow-hidden rounded-xl"
              style={{
                bottom: "calc(100% + 8px)",
                left: collapsed ? "8px" : "12px",
                right: collapsed ? undefined : "12px",
                width: collapsed ? "200px" : undefined,
                backgroundColor: theme.sidebarBg,
                border: `1px solid ${theme.border}`,
                boxShadow:
                  theme.mode === "dark"
                    ? "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03)"
                    : "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="px-3 py-2"
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest font-medium"
                  style={{ color: theme.textMuted }}
                >
                  Theme
                </span>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                {THEME_OPTIONS.map((opt) => {
                  const isCurrentTheme = opt.style === style && opt.mode === mode;
                  return (
                    <ThemePreview
                      key={`${opt.style}-${opt.mode}`}
                      config={opt.config}
                      label={opt.label}
                      isActive={isCurrentTheme}
                      onClick={() => selectTheme(opt.style, opt.mode)}
                      hostTheme={theme}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger button */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              className="rounded p-1.5 transition-colors"
              style={{
                color: themePickerOpen ? theme.accent : theme.textMuted,
                backgroundColor: themePickerOpen ? theme.accentMuted : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!themePickerOpen) e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={(e) => {
                if (!themePickerOpen) e.currentTarget.style.color = theme.textMuted;
              }}
              title="Change theme"
            >
              {/* Palette icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6.5" />
                <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
                <circle cx="5.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
                <circle cx="6.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
                <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setThemePickerOpen(!themePickerOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors"
            style={{
              color: themePickerOpen ? theme.accent : theme.textMuted,
              backgroundColor: themePickerOpen ? theme.accentMuted : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!themePickerOpen) e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              if (!themePickerOpen) e.currentTarget.style.color = theme.textMuted;
            }}
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            <span className="flex-1 text-left whitespace-nowrap">
              {themeLabel}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{
                transform: themePickerOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <path d="M3 5l3-3 3 3" />
            </svg>
          </button>
        )}
      </div>
    </motion.aside>
  );
}
