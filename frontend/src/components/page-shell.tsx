"use client";

import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { ThemedBackground } from "@/components/dashboards/themed-components";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}

const maxWidthMap = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export function PageShell({
  title,
  description,
  action,
  maxWidth = "xl",
  children,
}: PageShellProps) {
  const { theme } = useTheme();

  return (
    <ThemedBackground>
      <div
        style={{
          maxWidth: maxWidthMap[maxWidth],
          marginLeft: "auto",
          marginRight: "auto",
          padding: "32px 24px",
        }}
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div>
            <motion.h1
              variants={staggerItem}
              style={{
                fontFamily: theme.displayFont,
                fontWeight: theme.headingWeight,
                fontStyle: theme.headingItalic ? "italic" : "normal",
                color: theme.text,
                fontSize: "28px",
                lineHeight: "1.2",
              }}
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                variants={staggerItem}
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textMuted,
                  fontSize: "14px",
                  lineHeight: theme.bodyLineHeight,
                  marginTop: "8px",
                }}
              >
                {description}
              </motion.p>
            )}
          </div>
          {action && (
            <motion.div variants={staggerItem}>{action}</motion.div>
          )}
        </motion.div>
        {children}
      </div>
    </ThemedBackground>
  );
}
