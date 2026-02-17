import type { Card } from "@/types";

export function getCardColor(cards: Card[], code: string): string {
  return cards.find((c) => c.code === code)?.color ?? "#6B7280";
}

export function getCardLabel(cards: Card[], code: string): string {
  return cards.find((c) => c.code === code)?.label ?? code;
}

export const CATEGORIES = [
  "Dining",
  "Groceries",
  "Gas",
  "Shopping",
  "Subscriptions",
  "Transportation",
  "Travel",
  "Health",
  "Uncategorized",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Dining: "#F59E0B",
  Groceries: "#10B981",
  Gas: "#EF4444",
  Shopping: "#8B5CF6",
  Subscriptions: "#EC4899",
  Transportation: "#06B6D4",
  Travel: "#3B82F6",
  Health: "#14B8A6",
  Uncategorized: "#6B7280",
};

export const API_BASE = "http://localhost:8080/api";
