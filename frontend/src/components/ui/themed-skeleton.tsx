"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "heading" | "card" | "chart" | "row";

interface ThemedSkeletonProps {
  variant: SkeletonVariant;
  className?: string;
}

const variantDimensions: Record<SkeletonVariant, React.CSSProperties & { borderRadius: string }> = {
  text: { height: "16px", width: "75%", borderRadius: "4px" },
  heading: { height: "32px", width: "192px", borderRadius: "8px" },
  card: { height: "128px", width: "100%", borderRadius: "16px" },
  chart: { height: "256px", width: "100%", borderRadius: "16px" },
  row: { height: "48px", width: "100%", borderRadius: "12px" },
};

export function ThemedSkeleton({ variant, className }: ThemedSkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  const baseColor = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const shimmerColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";

  const dimensions = variantDimensions[variant];

  return (
    <div
      className={cn(className)}
      style={{
        ...dimensions,
        backgroundColor: baseColor,
        backgroundImage: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}
