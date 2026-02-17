import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "filled" | "outlined";
  className?: string;
}

export function Badge({
  children,
  color,
  variant = "filled",
  className,
}: BadgeProps) {
  const style = color
    ? variant === "filled"
      ? { backgroundColor: `${color}20`, color }
      : { borderColor: `${color}60`, color }
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "filled" && !color && "bg-white/10 text-white/70",
        variant === "outlined" && "border",
        variant === "outlined" && !color && "border-border text-white/70",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
