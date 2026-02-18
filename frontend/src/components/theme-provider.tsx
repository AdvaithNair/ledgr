"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeStyle = "arctic" | "paper";
export type ThemeMode = "dark" | "light";

export interface ThemeConfig {
  style: ThemeStyle;
  mode: ThemeMode;
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textMutedSmall: string;
  accent: string;
  accentBright: string;
  accentMuted: string;
  danger: string;
  success: string;
  displayFont: string;
  bodyFont: string;
  glassPanel: string;
  cardShadow: string;
  hoverShadow: string;
  chartStroke: string;
  chartGradientStart: string;
  chartGradientEnd: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipRadius: string;
  tooltipShadow: string;
  axisColor: string;
  gridColor: string;
  panelRadius: string;
  panelPadding: string;
  labelColor: string;
  headingItalic: boolean;
  headingWeight: string;
  headingColor: string;
  bodyLineHeight: string;
  sidebarBg: string;
  barRadius: [number, number, number, number];
}

// ── Arctic Dark — frosted glass on deep navy ──
const ARCTIC_DARK: ThemeConfig = {
  style: "arctic",
  mode: "dark",
  bg: "#0A0A0F",
  surface: "rgba(255, 255, 255, 0.03)",
  border: "rgba(255, 255, 255, 0.06)",
  text: "#FFFFFF",
  textMuted: "rgba(125, 211, 252, 0.35)",
  textMutedSmall: "rgba(125, 211, 252, 0.5)",
  accent: "#7DD3FC",
  accentBright: "#38BDF8",
  accentMuted: "rgba(125, 211, 252, 0.15)",
  danger: "#F87171",
  success: "#34D399",
  displayFont: "var(--font-outfit)",
  bodyFont: "var(--font-dm-sans)",
  glassPanel: "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl",
  cardShadow: "0 0 30px rgba(125, 211, 252, 0.05)",
  hoverShadow: "0 0 30px rgba(125, 211, 252, 0.1)",
  chartStroke: "#7DD3FC",
  chartGradientStart: "rgba(125, 211, 252, 0.20)",
  chartGradientEnd: "transparent",
  tooltipBg: "rgba(20, 20, 25, 0.95)",
  tooltipBorder: "rgba(255,255,255,0.06)",
  tooltipRadius: "12px",
  tooltipShadow: "none",
  axisColor: "rgba(125, 211, 252, 0.35)",
  gridColor: "rgba(125, 211, 252, 0.08)",
  panelRadius: "16px",
  panelPadding: "20px",
  labelColor: "#7DD3FC",
  headingItalic: false,
  headingWeight: "700",
  headingColor: "#FFFFFF",
  sidebarBg: "#07070A",
  bodyLineHeight: "1.5",
  barRadius: [0, 4, 4, 0],
};

// ── Arctic Light — icy blue-white, frosted panels, blue accents ──
const ARCTIC_LIGHT: ThemeConfig = {
  style: "arctic",
  mode: "light",
  bg: "#EFF6FF",
  surface: "rgba(255, 255, 255, 0.7)",
  border: "rgba(125, 211, 252, 0.2)",
  text: "#0C1A2E",
  textMuted: "#5B7A9E",
  textMutedSmall: "#3B6491",
  accent: "#0284C7",
  accentBright: "#0369A1",
  accentMuted: "rgba(2, 132, 199, 0.1)",
  danger: "#DC2626",
  success: "#059669",
  displayFont: "var(--font-outfit)",
  bodyFont: "var(--font-dm-sans)",
  glassPanel: "bg-white/70 backdrop-blur-sm border border-sky-200/40 rounded-2xl",
  cardShadow: "0 2px 12px rgba(2, 132, 199, 0.06)",
  hoverShadow: "0 4px 20px rgba(2, 132, 199, 0.12)",
  chartStroke: "#0284C7",
  chartGradientStart: "rgba(2, 132, 199, 0.12)",
  chartGradientEnd: "transparent",
  tooltipBg: "rgba(255, 255, 255, 0.95)",
  tooltipBorder: "rgba(125, 211, 252, 0.25)",
  tooltipRadius: "12px",
  tooltipShadow: "0 4px 16px rgba(2, 132, 199, 0.1)",
  axisColor: "#5B7A9E",
  gridColor: "rgba(2, 132, 199, 0.08)",
  panelRadius: "16px",
  panelPadding: "20px",
  labelColor: "#0284C7",
  headingItalic: false,
  headingWeight: "700",
  headingColor: "#0C1A2E",
  sidebarBg: "#E4EEFB",
  bodyLineHeight: "1.5",
  barRadius: [0, 4, 4, 0],
};

// ── Paper Dark — warm charcoal, editorial, emerald accents ──
const PAPER_DARK: ThemeConfig = {
  style: "paper",
  mode: "dark",
  bg: "#171412",
  surface: "rgba(255, 255, 255, 0.04)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F5F0EB",
  textMuted: "#8B7E74",
  textMutedSmall: "#A69888",
  accent: "#34D399",
  accentBright: "#10B981",
  accentMuted: "rgba(52, 211, 153, 0.12)",
  danger: "#F87171",
  success: "#34D399",
  displayFont: "var(--font-fraunces)",
  bodyFont: "var(--font-source-serif)",
  glassPanel: "bg-white/[0.04] border border-white/[0.08] rounded-xl",
  cardShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  hoverShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
  chartStroke: "#34D399",
  chartGradientStart: "rgba(52, 211, 153, 0.15)",
  chartGradientEnd: "transparent",
  tooltipBg: "rgba(23, 20, 18, 0.95)",
  tooltipBorder: "rgba(255,255,255,0.08)",
  tooltipRadius: "8px",
  tooltipShadow: "0 4px 12px rgba(0,0,0,0.3)",
  axisColor: "#8B7E74",
  gridColor: "rgba(255, 255, 255, 0.06)",
  panelRadius: "12px",
  panelPadding: "24px",
  labelColor: "#A69888",
  headingItalic: true,
  headingWeight: "400",
  headingColor: "#34D399",
  sidebarBg: "#120F0D",
  bodyLineHeight: "1.75",
  barRadius: [0, 3, 3, 0],
};

// ── Paper Light — warm off-white, editorial, emerald accents ──
const PAPER_LIGHT: ThemeConfig = {
  style: "paper",
  mode: "light",
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#1A1A1A",
  textMuted: "#9CA3AF",
  textMutedSmall: "#6B7280",
  accent: "#059669",
  accentBright: "#047857",
  accentMuted: "rgba(5, 150, 105, 0.08)",
  danger: "#DC2626",
  success: "#059669",
  displayFont: "var(--font-fraunces)",
  bodyFont: "var(--font-source-serif)",
  glassPanel: "bg-white border border-gray-200 rounded-xl shadow-sm",
  cardShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  hoverShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  chartStroke: "#1A1A1A",
  chartGradientStart: "rgba(5, 150, 105, 0.08)",
  chartGradientEnd: "transparent",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E5E7EB",
  tooltipRadius: "8px",
  tooltipShadow: "0 4px 12px rgba(0,0,0,0.1)",
  axisColor: "#9CA3AF",
  gridColor: "#E5E7EB",
  panelRadius: "12px",
  panelPadding: "24px",
  labelColor: "#6B7280",
  headingItalic: true,
  headingWeight: "400",
  headingColor: "#059669",
  sidebarBg: "#F3F2EF",
  bodyLineHeight: "1.75",
  barRadius: [0, 3, 3, 0],
};

// ── Theme lookup ──
const THEMES: Record<string, ThemeConfig> = {
  "arctic-dark": ARCTIC_DARK,
  "arctic-light": ARCTIC_LIGHT,
  "paper-dark": PAPER_DARK,
  "paper-light": PAPER_LIGHT,
};

function getTheme(style: ThemeStyle, mode: ThemeMode): ThemeConfig {
  return THEMES[`${style}-${mode}`];
}

// ── Context ──
interface ThemeContextValue {
  theme: ThemeConfig;
  style: ThemeStyle;
  mode: ThemeMode;
  setStyle: (s: ThemeStyle) => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: ARCTIC_DARK,
  style: "arctic",
  mode: "dark",
  setStyle: () => {},
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STYLE_KEY = "ledgr-theme-style";
const MODE_KEY = "ledgr-theme-mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<ThemeStyle>("arctic");
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedStyle = localStorage.getItem(STYLE_KEY);
    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedStyle === "arctic" || savedStyle === "paper") {
      setStyleState(savedStyle);
    }
    if (savedMode === "dark" || savedMode === "light") {
      setModeState(savedMode);
    }
    setMounted(true);
  }, []);

  const setStyle = (s: ThemeStyle) => {
    setStyleState(s);
    localStorage.setItem(STYLE_KEY, s);
  };

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
  };

  const theme = getTheme(style, mode);

  // Set data attribute on html for CSS selectors (scrollbar, color-scheme)
  useEffect(() => {
    if (mounted) {
      document.documentElement.dataset.themeMode = mode;
      document.documentElement.dataset.themeStyle = style;
    }
  }, [mounted, mode, style]);

  // Render with default theme during SSR to avoid flash-of-nothing
  return (
    <ThemeContext.Provider value={{ theme, style, mode, setStyle, setMode }}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// Convenience hook for frequently-used color tokens
export function useThemeColors() {
  const { theme } = useTheme();
  return {
    text: theme.text,
    textMuted: theme.textMuted,
    bg: theme.bg,
    surface: theme.surface,
    border: theme.border,
    accent: theme.accent,
    danger: theme.danger,
    success: theme.success,
    displayFont: theme.displayFont,
    bodyFont: theme.bodyFont,
    mode: theme.mode,
    style: theme.style,
  };
}

export { ARCTIC_DARK, ARCTIC_LIGHT, PAPER_DARK, PAPER_LIGHT };
