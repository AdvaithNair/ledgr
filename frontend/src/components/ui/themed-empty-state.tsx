"use client";

import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { ThemedButton } from "@/components/ui/themed-button";
import { cn } from "@/lib/utils";

type EmptyVariant = "transactions" | "analytics" | "import" | "settings" | "generic";

interface ThemedEmptyStateProps {
  variant: EmptyVariant;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

function VariantIcon({ variant, color }: { variant: EmptyVariant; color: string }) {
  const props = {
    width: 48,
    height: 48,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (variant) {
    case "transactions":
      // Three horizontal lines fading out (a ledger)
      return (
        <svg {...props}>
          <line x1="10" y1="16" x2="38" y2="16" opacity="1" />
          <line x1="10" y1="24" x2="34" y2="24" opacity="0.6" />
          <line x1="10" y1="32" x2="28" y2="32" opacity="0.3" />
        </svg>
      );
    case "analytics":
      // Mini chart with upward trend
      return (
        <svg {...props}>
          <polyline points="8,36 16,28 24,32 32,18 40,12" />
          <line x1="8" y1="40" x2="40" y2="40" opacity="0.4" />
          <line x1="8" y1="8" x2="8" y2="40" opacity="0.4" />
        </svg>
      );
    case "import":
      // Inbox with downward arrow
      return (
        <svg {...props}>
          <path d="M10 28L10 36C10 37.1 10.9 38 12 38L36 38C37.1 38 38 37.1 38 36L38 28" />
          <line x1="24" y1="10" x2="24" y2="30" />
          <polyline points="18,24 24,30 30,24" />
        </svg>
      );
    case "settings":
      // Two sliders/toggles
      return (
        <svg {...props}>
          <line x1="10" y1="18" x2="38" y2="18" opacity="0.4" />
          <circle cx="28" cy="18" r="3" />
          <line x1="10" y1="30" x2="38" y2="30" opacity="0.4" />
          <circle cx="18" cy="30" r="3" />
        </svg>
      );
    case "generic":
    default:
      // Folder outline
      return (
        <svg {...props}>
          <path d="M10 14L10 36C10 37.1 10.9 38 12 38L36 38C37.1 38 38 37.1 38 36L38 18C38 16.9 37.1 16 36 16L26 16L22 12L12 12C10.9 12 10 12.9 10 14Z" />
        </svg>
      );
  }
}

export function ThemedEmptyState({
  variant,
  title,
  description,
  action,
  secondaryAction,
  className,
}: ThemedEmptyStateProps) {
  const { theme } = useTheme();

  const iconColor = `color-mix(in srgb, ${theme.accent} 40%, transparent)`;

  return (
    <div
      className={cn(className)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "80px",
        paddingBottom: "80px",
        textAlign: "center",
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ marginBottom: "24px" }}
      >
        <VariantIcon variant={variant} color={iconColor} />
      </motion.div>

      <h3
        style={{
          fontFamily: theme.displayFont,
          fontWeight: theme.headingWeight,
          fontStyle: theme.headingItalic ? "italic" : "normal",
          color: theme.text,
          fontSize: "18px",
          lineHeight: "1.3",
          marginBottom: description ? "8px" : "0",
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontFamily: theme.bodyFont,
            color: theme.textMuted,
            fontSize: "14px",
            lineHeight: theme.bodyLineHeight,
            maxWidth: "360px",
          }}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          {action && (
            <ThemedButton variant="primary" href={action.href}>
              {action.label}
            </ThemedButton>
          )}
          {secondaryAction && (
            <ThemedButton variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </ThemedButton>
          )}
        </div>
      )}
    </div>
  );
}
