"use client";

import React, { type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemedBadgeProps {
  children: ReactNode;
  color?: string;
  variant?: "filled" | "outlined";
  className?: string;
}

export function ThemedBadge({
  children,
  color,
  variant = "filled",
  className,
}: ThemedBadgeProps) {
  const { theme } = useTheme();

  const resolvedColor = color || theme.accent;

  const style: React.CSSProperties =
    variant === "filled"
      ? {
          backgroundColor: `color-mix(in srgb, ${resolvedColor} 12%, transparent)`,
          color: resolvedColor,
          border: "1px solid transparent",
        }
      : {
          backgroundColor: "transparent",
          color: resolvedColor,
          border: `1px solid color-mix(in srgb, ${resolvedColor} 30%, transparent)`,
        };

  return (
    <span
      className={cn(className)}
      style={{
        ...style,
        fontFamily: theme.bodyFont,
        fontWeight: 500,
        fontSize: "11px",
        lineHeight: "1",
        borderRadius: "9999px",
        paddingLeft: "10px",
        paddingRight: "10px",
        paddingTop: "4px",
        paddingBottom: "4px",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
