"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { PageShell } from "@/components/page-shell";
import { ThemedPanel, ThemedTable, ThemedTh, ThemedTd } from "@/components/dashboards/themed-components";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput, ThemedSelect } from "@/components/ui/themed-input";
import { ThemedBadge } from "@/components/ui/themed-badge";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { useTheme } from "@/components/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { getCardColor, getCardLabel, CATEGORIES, CATEGORY_COLORS } from "@/lib/constants";
import { getTransactions, getCards, updateCategory } from "@/lib/api";
import type { Transaction, PaginationMeta, Card } from "@/types";

// ── Date range helpers ──

function getDateRangeParams(range: string): Record<string, string> {
  const now = new Date();
  switch (range) {
    case "this_month": {
      const start = startOfMonth(now);
      return { start_date: format(start, "yyyy-MM-dd") };
    }
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return { start_date: format(start, "yyyy-MM-dd"), end_date: format(end, "yyyy-MM-dd") };
    }
    case "last_3_months": {
      const start = startOfMonth(subMonths(now, 2));
      return { start_date: format(start, "yyyy-MM-dd") };
    }
    case "last_6_months": {
      const start = startOfMonth(subMonths(now, 5));
      return { start_date: format(start, "yyyy-MM-dd") };
    }
    case "this_year": {
      const start = startOfYear(now);
      return { start_date: format(start, "yyyy-MM-dd") };
    }
    case "all":
    default:
      return {};
  }
}

function getSortParams(sortBy: string): Record<string, string> {
  switch (sortBy) {
    case "date_desc":
      return { sort_by: "date", sort_dir: "desc" };
    case "date_asc":
      return { sort_by: "date", sort_dir: "asc" };
    case "amount_desc":
      return { sort_by: "amount", sort_dir: "desc" };
    case "amount_asc":
      return { sort_by: "amount", sort_dir: "asc" };
    default:
      return { sort_by: "date", sort_dir: "desc" };
  }
}

// ── Search icon SVG ──

function SearchIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Main page ──

export default function TransactionsPage() {
  const { theme } = useTheme();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cardFilter, setCardFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateRange, setDateRange] = useState("this_month");
  const [sortBy, setSortBy] = useState("date_desc");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Load cards once
  useEffect(() => {
    getCards()
      .then((res) => setCards(res.data))
      .catch(() => {});
  }, []);

  // Fetch transactions
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params: Record<string, string> = {
      page: String(page),
      per_page: "25",
      ...getDateRangeParams(dateRange),
      ...getSortParams(sortBy),
    };

    if (debouncedSearch) params.search = debouncedSearch;
    if (cardFilter) params.card = cardFilter;
    if (categoryFilter) params.category = categoryFilter;

    getTransactions(params)
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.data);
        setMeta(res.meta);
      })
      .catch(() => {
        if (cancelled) return;
        setTransactions([]);
        setMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, cardFilter, categoryFilter, dateRange, sortBy]);

  // Category update handler
  const handleCategoryChange = useCallback(
    async (txnId: string, newCategory: string) => {
      setEditingCategory(null);
      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) => (t.id === txnId ? { ...t, category: newCategory } : t))
      );
      try {
        await updateCategory(txnId, newCategory);
      } catch {
        // Revert on failure — refetch
        const params: Record<string, string> = {
          page: String(page),
          per_page: "25",
          ...getDateRangeParams(dateRange),
          ...getSortParams(sortBy),
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (cardFilter) params.card = cardFilter;
        if (categoryFilter) params.category = categoryFilter;
        const res = await getTransactions(params);
        setTransactions(res.data);
        setMeta(res.meta);
      }
    },
    [page, debouncedSearch, cardFilter, categoryFilter, dateRange, sortBy]
  );

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCardFilter("");
    setCategoryFilter("");
    setDateRange("this_month");
    setSortBy("date_desc");
    setPage(1);
  };

  // Determine empty state type
  const hasFilters = debouncedSearch || cardFilter || categoryFilter || dateRange !== "this_month";
  const isEmpty = !loading && transactions.length === 0;
  const isFilteredEmpty = isEmpty && hasFilters;
  const isTotallyEmpty = isEmpty && !hasFilters;

  // Pagination display
  const showingStart = meta ? (meta.page - 1) * meta.per_page + 1 : 0;
  const showingEnd = meta ? Math.min(meta.page * meta.per_page, meta.total) : 0;

  // Format short date like "Feb 18"
  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch {
      return dateStr;
    }
  };

  // Get 2-letter card abbreviation
  const getCardAbbr = (cardCode: string) => {
    const label = getCardLabel(cards, cardCode);
    if (label.length <= 2) return label.toUpperCase();
    const words = label.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return label.slice(0, 2).toUpperCase();
  };

  return (
    <PageShell title="Transactions" description="All your spending in one place" maxWidth="xl">
      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <ThemedPanel style={{ padding: theme.panelPadding, marginBottom: "24px" }}>
          <div className="flex flex-col gap-3">
            {/* Search — full width */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <SearchIcon color={theme.textMuted} />
              </div>
              <ThemedInput
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>

            {/* Filter row — 2x2 on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ThemedSelect
                value={cardFilter}
                onChange={(e) => {
                  setCardFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Cards</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </ThemedSelect>

              <ThemedSelect
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </ThemedSelect>

              <ThemedSelect
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setPage(1);
                }}
              >
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="last_3_months">Last 3 months</option>
                <option value="last_6_months">Last 6 months</option>
                <option value="this_year">This year</option>
                <option value="all">All time</option>
              </ThemedSelect>

              <ThemedSelect
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
                <option value="amount_desc">Amount (high to low)</option>
                <option value="amount_asc">Amount (low to high)</option>
              </ThemedSelect>
            </div>
          </div>
        </ThemedPanel>
      </motion.div>

      {/* Transaction table / loading / empty */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ThemedPanel style={{ padding: theme.panelPadding }}>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ThemedSkeleton key={i} variant="row" />
                ))}
              </div>
            </ThemedPanel>
          </motion.div>
        ) : isTotallyEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ThemedPanel>
              <ThemedEmptyState
                variant="transactions"
                title="No transactions yet"
                description="Import a CSV file to get started tracking your spending."
                action={{ label: "Import CSV", href: "/import" }}
              />
            </ThemedPanel>
          </motion.div>
        ) : isFilteredEmpty ? (
          <motion.div
            key="filtered-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ThemedPanel style={{ padding: "64px 24px", textAlign: "center" as const }}>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  color: theme.textMuted,
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                No transactions match your filters
              </p>
              <ThemedButton variant="ghost" onClick={clearFilters}>
                Clear filters
              </ThemedButton>
            </ThemedPanel>
          </motion.div>
        ) : (
          <motion.div
            key={`page-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ThemedPanel style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <ThemedTable>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <ThemedTh className="pl-5 pr-2 w-[80px]">
                        Date
                      </ThemedTh>
                      <ThemedTh className="px-2">Description</ThemedTh>
                      <ThemedTh className="px-2 w-[140px]">
                        Category
                      </ThemedTh>
                      <ThemedTh className="px-2 w-[80px]">
                        Card
                      </ThemedTh>
                      <ThemedTh numeric className="pl-2 pr-5 w-[100px]">
                        Amount
                      </ThemedTh>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, i) => {
                      const cardColor = getCardColor(cards, txn.card);
                      const cardAbbr = getCardAbbr(txn.card);
                      const categoryColor = CATEGORY_COLORS[txn.category] || CATEGORY_COLORS.Uncategorized;
                      const isEditing = editingCategory === txn.id;

                      return (
                        <motion.tr
                          key={txn.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: i * 0.03 }}
                          className="transition-colors duration-150"
                          style={{ borderBottom: `1px solid ${theme.border}` }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor =
                              theme.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          {/* DATE */}
                          <td
                            className="pl-5 pr-2 py-3"
                            style={{
                              fontFamily: theme.bodyFont,
                              fontVariantNumeric: "tabular-nums",
                              fontSize: "12px",
                              color: theme.textMuted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatShortDate(txn.date)}
                          </td>

                          {/* DESCRIPTION */}
                          <td
                            className="px-2 py-3"
                            style={{
                              fontFamily: theme.bodyFont,
                              fontSize: "13px",
                              color: theme.text,
                              maxWidth: "0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {txn.description}
                          </td>

                          {/* CATEGORY */}
                          <td className="px-2 py-3" style={{ width: "140px" }}>
                            <AnimatePresence mode="wait">
                              {isEditing ? (
                                <motion.div
                                  key="select"
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.95, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                  <ThemedSelect
                                    value={txn.category}
                                    onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                                    onBlur={() => setEditingCategory(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setEditingCategory(null);
                                    }}
                                    autoFocus
                                    style={{
                                      fontSize: "12px",
                                      padding: "4px 28px 4px 8px",
                                      borderRadius: "8px",
                                    }}
                                  >
                                    {CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </ThemedSelect>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="badge"
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.95, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategory(txn.id)}
                                    style={{
                                      cursor: "pointer",
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                    }}
                                  >
                                    <ThemedBadge color={categoryColor}>
                                      {txn.category}
                                    </ThemedBadge>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>

                          {/* CARD */}
                          <td className="px-2 py-3" style={{ whiteSpace: "nowrap" }}>
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  backgroundColor: cardColor,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: theme.bodyFont,
                                  fontSize: "12px",
                                  color: theme.textMuted,
                                  fontWeight: 500,
                                }}
                              >
                                {cardAbbr}
                              </span>
                            </div>
                          </td>

                          {/* AMOUNT */}
                          <td
                            className="pl-2 pr-5 py-3 text-right"
                            style={{
                              fontFamily: theme.bodyFont,
                              fontVariantNumeric: "tabular-nums",
                              fontSize: "13px",
                              color: theme.text,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatCurrency(txn.amount)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </ThemedTable>
              </div>

              {/* Pagination */}
              {meta && meta.total_pages > 0 && (
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderTop: `1px solid ${theme.border}` }}
                >
                  <span
                    style={{
                      fontFamily: theme.bodyFont,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "12px",
                      color: theme.textMuted,
                    }}
                  >
                    Showing {showingStart}&ndash;{showingEnd} of {meta.total}
                  </span>

                  <div className="flex items-center gap-3">
                    <ThemedButton
                      variant="ghost"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      &larr; Prev
                    </ThemedButton>

                    <span
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "13px",
                        color: theme.textMuted,
                      }}
                    >
                      Page {meta.page} of {meta.total_pages}
                    </span>

                    <ThemedButton
                      variant="ghost"
                      size="sm"
                      disabled={page >= meta.total_pages}
                      onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                    >
                      Next &rarr;
                    </ThemedButton>
                  </div>
                </div>
              )}
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
