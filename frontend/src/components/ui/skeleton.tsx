import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "chart";
}

const variantStyles = {
  text: "h-4 w-3/4 rounded",
  card: "h-32 w-full rounded-lg",
  chart: "h-64 w-full rounded-lg",
};

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5",
        variantStyles[variant],
        className
      )}
    />
  );
}
