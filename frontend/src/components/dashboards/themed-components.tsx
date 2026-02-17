"use client";

import React, { type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// ── ThemedPanel ──
export function ThemedPanel({
  children,
  className,
  hover = false,
  style: styleProp,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  const { theme } = useTheme();
  return (
    <div
      className={cn(
        theme.glassPanel,
        hover && "transition-all duration-200",
        className
      )}
      style={{
        boxShadow: theme.cardShadow,
        ...styleProp,
      }}
      onMouseEnter={
        hover
          ? (e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                theme.hoverShadow;
              if (theme.mode === "dark") {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.12)";
              }
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                theme.cardShadow;
              if (theme.mode === "dark") {
                (e.currentTarget as HTMLElement).style.borderColor =
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : theme.border;
              }
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// ── ThemedBackground ──
export function ThemedBackground({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  if (theme.mode === "light") {
    return (
      <div
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 0 80px rgba(0,0,0,0.3)",
          minHeight: "100vh",
        }}
      >
        {/* Arctic light gets subtle frost blobs behind the content */}
        {theme.style === "arctic" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "24px 24px 0 0" }}>
            <div
              className="absolute top-20 left-1/4 h-80 w-80 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(2, 132, 199, 0.06) 0%, transparent 70%)",
                filter: "blur(80px)",
              }}
            />
            <div
              className="absolute top-[50%] right-1/4 h-96 w-96 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 70%)",
                filter: "blur(80px)",
              }}
            />
          </div>
        )}
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  // Dark mode — render blobs + content
  // Both arctic-dark and paper-dark get blobs, with style-appropriate colors
  const blobColor = theme.style === "arctic"
    ? "rgba(125, 211, 252, 0.08)"
    : "rgba(52, 211, 153, 0.06)";
  const blobColor2 = theme.style === "arctic"
    ? "rgba(56, 189, 248, 0.08)"
    : "rgba(16, 185, 129, 0.05)";
  const blobColor3 = theme.style === "arctic"
    ? "rgba(125, 211, 252, 0.06)"
    : "rgba(52, 211, 153, 0.04)";

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute top-20 left-1/4 h-80 w-80 rounded-full"
        style={{
          background: `radial-gradient(circle, ${blobColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none absolute top-[60%] right-1/4 h-96 w-96 rounded-full"
        style={{
          background: `radial-gradient(circle, ${blobColor2} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none absolute top-[40%] left-1/2 h-72 w-72 rounded-full"
        style={{
          background: `radial-gradient(circle, ${blobColor3} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      {children}
    </div>
  );
}

// ── ThemedHeading ──
export function ThemedHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p";
}) {
  const { theme } = useTheme();
  return (
    <Tag
      className={className}
      style={{
        fontFamily: theme.displayFont,
        fontWeight: theme.headingWeight,
        fontStyle: theme.headingItalic ? "italic" : "normal",
        color: theme.text,
      }}
    >
      {children}
    </Tag>
  );
}

// ── ThemedText ──
export function ThemedText({
  children,
  className,
  muted = false,
  small = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  small?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <span
      className={className}
      style={{
        fontFamily: theme.bodyFont,
        color: muted
          ? small
            ? theme.textMutedSmall
            : theme.textMuted
          : theme.text,
      }}
    >
      {children}
    </span>
  );
}

// ── ThemedDivider ──
export function ThemedDivider({ className }: { className?: string }) {
  const { theme } = useTheme();

  // Arctic styles get dashed dividers, paper gets solid
  const isArctic = theme.style === "arctic";
  const dividerColor = theme.mode === "dark"
    ? isArctic ? "rgba(125,211,252,0.15)" : "rgba(255,255,255,0.08)"
    : isArctic ? "rgba(2,132,199,0.15)" : "#E5E7EB";

  return (
    <hr
      className={cn("border-0", className)}
      style={{
        height: "1px",
        ...(isArctic
          ? {
              backgroundImage:
                `repeating-linear-gradient(to right, ${dividerColor} 0, ${dividerColor} 6px, transparent 6px, transparent 12px)`,
            }
          : {
              background: dividerColor,
            }),
      }}
    />
  );
}

// ── ThemedLabel ──
export function ThemedLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <p
      className={cn("text-sm tracking-widest uppercase", className)}
      style={{
        color: theme.labelColor,
        fontFamily: theme.bodyFont,
        letterSpacing: theme.style === "paper" ? "0.12em" : "0.1em",
      }}
    >
      {children}
    </p>
  );
}

// ── ThemedSectionHeading ── style-aware section heading
export function ThemedSectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <h2
      className={cn("text-xl", className)}
      style={{
        fontFamily: theme.displayFont,
        fontWeight: theme.headingWeight,
        fontStyle: theme.headingItalic ? "italic" : "normal",
        color: theme.headingColor,
      }}
    >
      {children}
    </h2>
  );
}

// ── Numeric style helper ── style-native number treatment (replaces font-mono)
export function useNumericStyle(): React.CSSProperties {
  const { theme } = useTheme();
  return {
    fontFamily: theme.bodyFont,
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
  };
}

// ── Tooltip style helper ──
export function useTooltipStyle() {
  const { theme } = useTheme();
  return {
    backgroundColor: theme.tooltipBg,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: theme.tooltipRadius,
    color: theme.text,
    ...(theme.tooltipShadow !== "none"
      ? { boxShadow: theme.tooltipShadow }
      : {}),
    ...(theme.mode === "dark"
      ? { backdropFilter: "blur(8px)" }
      : {}),
  };
}

// ── Chart gradient ID helper (unique per layout+theme to avoid conflicts) ──
export function useChartGradientId(prefix: string) {
  const { style, mode } = useTheme();
  return `${prefix}-${style}-${mode}`;
}
