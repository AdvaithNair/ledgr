"use client";

import { type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: theme.bg, color: theme.text }}
      >
        {children}
      </main>
    </div>
  );
}
