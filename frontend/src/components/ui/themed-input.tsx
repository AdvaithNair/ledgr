"use client";

import React, { forwardRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// ── Shared base style builder ──
function useInputBaseStyle(): React.CSSProperties {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return {
    fontFamily: theme.bodyFont,
    fontSize: "14px",
    lineHeight: "1.5",
    borderRadius: "12px",
    paddingLeft: "16px",
    paddingRight: "16px",
    paddingTop: "12px",
    paddingBottom: "12px",
    outline: "none",
    transitionProperty: "border-color, box-shadow, background-color",
    transitionDuration: "200ms",
    width: "100%",
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF",
    border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : theme.border}`,
    color: theme.text,
  };
}

function useFocusHandlers() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (isDark) {
      e.currentTarget.style.borderColor = `color-mix(in srgb, ${theme.accent} 50%, transparent)`;
      e.currentTarget.style.boxShadow = `0 0 0 1px color-mix(in srgb, ${theme.accent} 20%, transparent)`;
    } else {
      e.currentTarget.style.borderColor = theme.accent;
      e.currentTarget.style.boxShadow = "none";
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = isDark
      ? "rgba(255, 255, 255, 0.08)"
      : theme.border;
    e.currentTarget.style.boxShadow = "none";
  };

  return { onFocus, onBlur };
}

// ── ThemedInput ──
export const ThemedInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function ThemedInput({ className, style: styleProp, onFocus, onBlur, ...props }, ref) {
  const baseStyle = useInputBaseStyle();
  const { theme } = useTheme();
  const focus = useFocusHandlers();

  return (
    <input
      ref={ref}
      className={cn(className)}
      style={{
        ...baseStyle,
        ...styleProp,
      }}
      onFocus={(e) => {
        focus.onFocus(e);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focus.onBlur(e);
        onBlur?.(e);
      }}
      {...props}
    />
  );
});

// ── ThemedSelect ──
export const ThemedSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function ThemedSelect(
  { className, style: styleProp, children, onFocus, onBlur, ...props },
  ref
) {
  const baseStyle = useInputBaseStyle();
  const { theme } = useTheme();
  const focus = useFocusHandlers();

  return (
    <div style={{ position: "relative" }}>
      <select
        ref={ref}
        className={cn(className)}
        style={{
          ...baseStyle,
          appearance: "none",
          paddingRight: "40px",
          cursor: "pointer",
          ...styleProp,
        }}
        onFocus={(e) => {
          focus.onFocus(e);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focus.onBlur(e);
          onBlur?.(e);
        }}
        {...props}
      >
        {children}
      </select>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke={theme.textMuted}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

// ── ThemedTextarea ──
export const ThemedTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function ThemedTextarea({ className, style: styleProp, onFocus, onBlur, ...props }, ref) {
  const baseStyle = useInputBaseStyle();
  const focus = useFocusHandlers();

  return (
    <textarea
      ref={ref}
      className={cn(className)}
      style={{
        ...baseStyle,
        minHeight: "100px",
        resize: "vertical",
        ...styleProp,
      }}
      onFocus={(e) => {
        focus.onFocus(e);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focus.onBlur(e);
        onBlur?.(e);
      }}
      {...props}
    />
  );
});
