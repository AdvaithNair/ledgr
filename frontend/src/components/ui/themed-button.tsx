"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ThemedButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  href?: string;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { paddingLeft: "12px", paddingRight: "12px", paddingTop: "6px", paddingBottom: "6px", fontSize: "12px" },
  md: { paddingLeft: "16px", paddingRight: "16px", paddingTop: "10px", paddingBottom: "10px", fontSize: "14px" },
  lg: { paddingLeft: "24px", paddingRight: "24px", paddingTop: "12px", paddingBottom: "12px", fontSize: "16px" },
};

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28"
        strokeDashoffset="20"
        opacity="0.8"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function ThemedButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  onClick,
  className,
  type = "button",
  href,
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: theme.accent,
      color: "#FFFFFF",
      border: "1px solid transparent",
    },
    secondary: {
      backgroundColor: "transparent",
      color: theme.text,
      border: `1px solid ${theme.border}`,
    },
    danger: {
      backgroundColor: `color-mix(in srgb, ${theme.danger} 10%, transparent)`,
      color: theme.danger,
      border: `1px solid color-mix(in srgb, ${theme.danger} 20%, transparent)`,
    },
    ghost: {
      backgroundColor: "transparent",
      color: theme.textMuted,
      border: "1px solid transparent",
    },
  };

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || loading) return;
      const el = e.currentTarget;
      if (variant === "primary") {
        el.style.filter = "brightness(1.15)";
      } else if (variant === "secondary") {
        el.style.backgroundColor = isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 0, 0, 0.05)";
      } else if (variant === "danger") {
        el.style.backgroundColor = `color-mix(in srgb, ${theme.danger} 15%, transparent)`;
      } else if (variant === "ghost") {
        el.style.color = theme.text;
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || loading) return;
      const el = e.currentTarget;
      if (variant === "primary") {
        el.style.filter = "none";
      } else if (variant === "secondary") {
        el.style.backgroundColor = "transparent";
      } else if (variant === "danger") {
        el.style.backgroundColor = `color-mix(in srgb, ${theme.danger} 10%, transparent)`;
      } else if (variant === "ghost") {
        el.style.color = theme.textMuted;
      }
    },
  };

  const baseStyle: React.CSSProperties = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    fontFamily: theme.bodyFont,
    fontWeight: 500,
    borderRadius: "12px",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transitionProperty: "background-color, color, border-color, filter, opacity",
    transitionDuration: "200ms",
    textDecoration: "none",
    lineHeight: "1",
    whiteSpace: "nowrap",
  };

  const spinnerColor =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "danger"
        ? theme.danger
        : theme.textMuted;

  const content = loading ? <Spinner color={spinnerColor} /> : children;

  if (href) {
    return (
      <motion.div whileTap={{ scale: disabled || loading ? 1 : 0.97 }}>
        <Link
          href={href}
          className={cn(className)}
          style={baseStyle}
          onClick={disabled || loading ? (e) => e.preventDefault() : onClick}
          {...hoverHandlers}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={cn(className)}
      style={baseStyle}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      type={type}
      {...hoverHandlers}
    >
      {content}
    </motion.button>
  );
}
