"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/1",
    matchPaths: ["/1", "/2", "/3", "/4", "/5"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="7" height="7" rx="1" />
        <rect x="10" y="1" width="7" height="7" rx="1" />
        <rect x="1" y="10" width="7" height="7" rx="1" />
        <rect x="10" y="10" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Import",
    href: "/import",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2v10m0 0l-3-3m3 3l3-3M3 13v2h12v-2" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h14M2 9h14M2 14h10" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 16V10h3v6H2zM7.5 16V6h3v10h-3zM13 16V2h3v14h-3z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="3" />
        <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.41 1.41M13.54 13.54l1.41 1.41M3.05 14.95l1.41-1.41M13.54 4.46l1.41-1.41" />
      </svg>
    ),
  },
];

const designTrials = [
  { id: 1, label: "Zen Flow" },
  { id: 2, label: "Command Deck" },
  { id: 3, label: "Daily Journal" },
  { id: 4, label: "Mosaic" },
  { id: 5, label: "Pulse" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(item: (typeof navItems)[0]) {
    if (item.matchPaths) return item.matchPaths.some((p) => pathname === p);
    return pathname === item.href;
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex h-screen flex-col border-r border-border bg-surface"
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/1" className="font-mono text-lg font-bold text-white">
            Ledgr
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {collapsed ? (
              <path d="M6 3l5 5-5 5" />
            ) : (
              <path d="M10 3L5 8l5 5" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "border-l-2 border-white bg-white/5 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {/* Design Trials */}
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-white/30">
            Design Trials
          </p>
        )}
        {designTrials.map((trial) => {
          const active = pathname === `/${trial.id}`;
          return (
            <Link
              key={trial.id}
              href={`/${trial.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
              title={collapsed ? trial.label : undefined}
            >
              <span className="flex-shrink-0 font-mono text-xs">{trial.id}</span>
              {!collapsed && (
                <span className="truncate text-xs">{trial.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Local only" />
          </div>
        ) : (
          <p className="text-[10px] text-white/30">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Local only
          </p>
        )}
      </div>
    </motion.aside>
  );
}
