"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";
import { PageShell } from "@/components/page-shell";
import {
  ThemedPanel,
  ThemedTable,
  ThemedTh,
  ThemedTd,
} from "@/components/dashboards/themed-components";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput, ThemedSelect } from "@/components/ui/themed-input";
import { ThemedDropdown, type DropdownOption } from "@/components/ui/themed-dropdown";
import { ThemedBadge } from "@/components/ui/themed-badge";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { ThemedEmptyState } from "@/components/ui/themed-empty-state";
import { useTheme } from "@/components/theme-provider";
import { formatCurrency } from "@/lib/utils";
import {
  getCardColor,
  getCardLabel,
  CATEGORIES,
  CATEGORY_COLORS,
} from "@/lib/constants";
import {
  getTransactions,
  getCards,
  updateCategory,
  bulkUpdateCategory,
} from "@/lib/api";
import type { Transaction, PaginationMeta, Card } from "@/types";

// ── Date range helpers ──

function getDateRangeParams(range: string, customStart?: string, customEnd?: string): Record<string, string> {
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
      return {
        start_date: format(start, "yyyy-MM-dd"),
        end_date: format(end, "yyyy-MM-dd"),
      };
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
    case "custom": {
      const params: Record<string, string> = {};
      if (customStart) params.start_date = customStart;
      if (customEnd) params.end_date = customEnd;
      return params;
    }
    case "all":
    default:
      return {};
  }
}

// ── Icons ──

function SearchIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" />
      <line
        x1="10.5"
        y1="10.5"
        x2="14"
        y2="14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({
  color,
  expanded,
}: {
  color: string;
  expanded: boolean;
}) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      animate={{ rotate: expanded ? 90 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ flexShrink: 0 }}
    >
      <path
        d="M5 3l4 4-4 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function SortArrow({ direction, color }: { direction: "asc" | "desc" | null; color: string }) {
  if (!direction) return null;
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: "4px", display: "inline-block" }}>
      <path
        d={direction === "asc" ? "M5 2L8 7H2L5 2Z" : "M5 8L2 3H8L5 8Z"}
        fill={color}
      />
    </svg>
  );
}

// ── Main page ──

function TransactionsPageInner() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();

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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [smartFallbackDone, setSmartFallbackDone] = useState(false);

  // Expandable rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Parse URL params on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get("search");
    const urlDateRange = searchParams.get("date_range");
    const urlCard = searchParams.get("card");
    const urlCategory = searchParams.get("category");

    if (urlSearch) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlDateRange) setDateRange(urlDateRange);
    if (urlCard) setCardFilter(urlCard);
    if (urlCategory) setCategoryFilter(urlCategory);
  }, [searchParams]);

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

  // Build params helper
  const buildParams = useCallback(() => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "25",
      ...getDateRangeParams(dateRange, customStartDate, customEndDate),
      sort_by: sortColumn,
      sort_order: sortDirection,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (cardFilter) params.card = cardFilter;
    if (categoryFilter) params.category = categoryFilter;
    return params;
  }, [page, debouncedSearch, cardFilter, categoryFilter, dateRange, customStartDate, customEndDate, sortColumn, sortDirection]);

  // Fetch transactions
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getTransactions(buildParams())
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.data);
        setMeta(res.meta);

        // Smart date range fallback: if this_month returns 0 results and no other filters
        if (
          dateRange === "this_month" &&
          !smartFallbackDone &&
          res.meta.total === 0 &&
          !debouncedSearch &&
          !cardFilter &&
          !categoryFilter
        ) {
          setSmartFallbackDone(true);
          // Try last_month
          getTransactions({ ...buildParams(), ...getDateRangeParams("last_month"), page: "1" })
            .then((r2) => {
              if (cancelled) return;
              if (r2.meta.total > 0) {
                setDateRange("last_month");
              } else {
                // Try last_3_months
                getTransactions({ ...buildParams(), ...getDateRangeParams("last_3_months"), page: "1" })
                  .then((r3) => {
                    if (cancelled) return;
                    if (r3.meta.total > 0) {
                      setDateRange("last_3_months");
                    } else {
                      setDateRange("all");
                    }
                  })
                  .catch(() => {});
              }
            })
            .catch(() => {});
        }
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
  }, [buildParams]);

  // Clear selection on page/filter change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, cardFilter, categoryFilter, dateRange, sortColumn, sortDirection]);

  // Column sorting handler
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "amount" ? "desc" : "desc");
    }
    setPage(1);
  };

  // Category update handler
  const handleCategoryChange = useCallback(
    async (txnId: string, newCategory: string) => {
      setEditingCategory(null);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txnId ? { ...t, category: newCategory } : t
        )
      );
      try {
        await updateCategory(txnId, newCategory);
      } catch {
        const res = await getTransactions(buildParams());
        setTransactions(res.data);
        setMeta(res.meta);
      }
    },
    [buildParams]
  );

  // Bulk category update
  const handleBulkCategoryUpdate = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await bulkUpdateCategory(Array.from(selectedIds), bulkCategory);
      const res = await getTransactions(buildParams());
      setTransactions(res.data);
      setMeta(res.meta);
      setSelectedIds(new Set());
      setBulkCategory("");
    } catch {
      // silent
    } finally {
      setBulkUpdating(false);
    }
  };

  // Toggle row expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCardFilter("");
    setCategoryFilter("");
    setDateRange("this_month");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortColumn("date");
    setSortDirection("desc");
    setPage(1);
    setSmartFallbackDone(false);
  };

  const hasFilters =
    debouncedSearch ||
    cardFilter ||
    categoryFilter ||
    dateRange !== "this_month";
  const isEmpty = !loading && transactions.length === 0;
  const isFilteredEmpty = isEmpty && hasFilters;
  const isTotallyEmpty = isEmpty && !hasFilters;

  const showingStart = meta ? (meta.page - 1) * meta.per_page + 1 : 0;
  const showingEnd = meta
    ? Math.min(meta.page * meta.per_page, meta.total)
    : 0;

  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d");
    } catch {
      return dateStr;
    }
  };

  const getCardAbbr = (cardCode: string) => {
    const label = getCardLabel(cards, cardCode);
    if (label.length <= 2) return label.toUpperCase();
    const words = label.split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return label.slice(0, 2).toUpperCase();
  };

  const allOnPageSelected =
    transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0;

  // Dropdown options
  const cardOptions: DropdownOption[] = useMemo(
    () => [
      { value: "", label: "All Cards" },
      ...cards.map((c) => ({ value: c.code, label: c.label })),
    ],
    [cards]
  );

  const categoryOptions: DropdownOption[] = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    ],
    []
  );

  const dateRangeOptions: DropdownOption[] = useMemo(
    () => [
      { value: "this_month", label: "This month" },
      { value: "last_month", label: "Last month" },
      { value: "last_3_months", label: "Last 3 months" },
      { value: "last_6_months", label: "Last 6 months" },
      { value: "this_year", label: "This year" },
      { value: "all", label: "All time" },
      { value: "custom", label: "Custom range" },
    ],
    []
  );

  // Column header style
  const sortableHeaderStyle = (column: string): React.CSSProperties => ({
    cursor: "pointer",
    userSelect: "none",
    color: sortColumn === column ? theme.accent : undefined,
  });

  return (
    <PageShell
      title="Transactions"
      description="All your spending in one place"
      maxWidth="xl"
    >
      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <ThemedPanel
          style={{ padding: theme.panelPadding, marginBottom: "16px" }}
        >
          <div className="flex flex-col gap-3">
            {/* Search — full width row 1 */}
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

            {/* Filter chips row 2 */}
            <div className="flex flex-wrap items-center gap-3">
              <ThemedDropdown
                options={cardOptions}
                value={cardFilter}
                onChange={(v) => {
                  setCardFilter(v);
                  setPage(1);
                }}
                placeholder="All Cards"
                style={{ minWidth: "160px", flex: "1 1 160px", maxWidth: "220px" }}
              />

              <ThemedDropdown
                options={categoryOptions}
                value={categoryFilter}
                onChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
                placeholder="All Categories"
                style={{ minWidth: "160px", flex: "1 1 160px", maxWidth: "220px" }}
              />

              <ThemedDropdown
                options={dateRangeOptions}
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  setPage(1);
                }}
                placeholder="Date Range"
                style={{ minWidth: "160px", flex: "1 1 160px", maxWidth: "220px" }}
              />

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: theme.bodyFont,
                    fontSize: "12px",
                    color: theme.accent,
                    padding: "8px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Custom date range inputs */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-3">
                <ThemedInput
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ maxWidth: "180px" }}
                />
                <span
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "13px",
                    color: theme.textMuted,
                  }}
                >
                  to
                </span>
                <ThemedInput
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ maxWidth: "180px" }}
                />
              </div>
            )}
          </div>
        </ThemedPanel>
      </motion.div>

      {/* Transaction Summary Bar */}
      {meta && meta.total > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ marginBottom: "16px" }}
        >
          <ThemedPanel style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-8">
              <div>
                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: theme.textMuted, fontFamily: theme.bodyFont }}
                >
                  Total
                </p>
                <p
                  className="font-mono text-lg tabular-nums"
                  style={{ color: theme.text, fontWeight: 600 }}
                >
                  {formatCurrency(meta.total_amount ?? 0)}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: theme.textMuted, fontFamily: theme.bodyFont }}
                >
                  Count
                </p>
                <p
                  className="font-mono text-lg tabular-nums"
                  style={{ color: theme.text, fontWeight: 600 }}
                >
                  {meta.total}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: theme.textMuted, fontFamily: theme.bodyFont }}
                >
                  Average
                </p>
                <p
                  className="font-mono text-lg tabular-nums"
                  style={{ color: theme.text, fontWeight: 600 }}
                >
                  {formatCurrency(
                    meta.total > 0 ? (meta.total_amount ?? 0) / meta.total : 0
                  )}
                </p>
              </div>
            </div>
          </ThemedPanel>
        </motion.div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", marginBottom: "16px" }}
          >
            <ThemedPanel
              style={{
                padding: "12px 20px",
                borderLeft: `3px solid ${theme.accent}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "13px",
                    color: theme.text,
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {selectedIds.size} selected
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                  }}
                >
                  <ThemedSelect
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    style={{ maxWidth: "180px", fontSize: "13px" }}
                  >
                    <option value="">Set category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </ThemedSelect>
                  <ThemedButton
                    variant="primary"
                    size="sm"
                    disabled={!bulkCategory}
                    loading={bulkUpdating}
                    onClick={handleBulkCategoryUpdate}
                  >
                    Apply
                  </ThemedButton>
                </div>

                <ThemedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setBulkCategory("");
                  }}
                >
                  Clear selection
                </ThemedButton>
              </div>
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>

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
            <ThemedPanel
              style={{
                padding: "64px 24px",
                textAlign: "center" as const,
              }}
            >
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
                    <tr
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      <th
                        style={{
                          width: "40px",
                          padding: "10px 0 10px 16px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAll}
                          title="Select all on this page"
                          style={{
                            width: "15px",
                            height: "15px",
                            cursor: "pointer",
                            accentColor: theme.accent,
                          }}
                        />
                      </th>
                      <ThemedTh
                        className="pr-2 w-[80px]"
                        style={sortableHeaderStyle("date")}
                        onClick={() => handleColumnSort("date")}
                      >
                        Date
                        <SortArrow
                          direction={sortColumn === "date" ? sortDirection : null}
                          color={theme.accent}
                        />
                      </ThemedTh>
                      <ThemedTh
                        className="px-2"
                        style={sortableHeaderStyle("description")}
                        onClick={() => handleColumnSort("description")}
                      >
                        Description
                        <SortArrow
                          direction={sortColumn === "description" ? sortDirection : null}
                          color={theme.accent}
                        />
                      </ThemedTh>
                      <ThemedTh
                        className="px-2 w-[140px]"
                        style={sortableHeaderStyle("category")}
                        onClick={() => handleColumnSort("category")}
                      >
                        Category
                        <SortArrow
                          direction={sortColumn === "category" ? sortDirection : null}
                          color={theme.accent}
                        />
                      </ThemedTh>
                      <ThemedTh className="px-2 w-[80px]">Card</ThemedTh>
                      <ThemedTh
                        numeric
                        className="pl-2 pr-5 w-[100px]"
                        style={sortableHeaderStyle("amount")}
                        onClick={() => handleColumnSort("amount")}
                      >
                        Amount
                        <SortArrow
                          direction={sortColumn === "amount" ? sortDirection : null}
                          color={theme.accent}
                        />
                      </ThemedTh>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, i) => {
                      const cardColor = getCardColor(cards, txn.card);
                      const cardAbbr = getCardAbbr(txn.card);
                      const categoryColor =
                        CATEGORY_COLORS[txn.category] ||
                        CATEGORY_COLORS.Uncategorized;
                      const isEditing = editingCategory === txn.id;
                      const isExpanded = expandedIds.has(txn.id);
                      const isSelected = selectedIds.has(txn.id);

                      return (
                        <React.Fragment key={txn.id}>
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.3,
                              delay: i * 0.03,
                            }}
                            className="transition-colors duration-150"
                            style={{
                              borderBottom: isExpanded
                                ? "none"
                                : `1px solid ${theme.border}`,
                              backgroundColor: isSelected
                                ? theme.mode === "dark"
                                  ? "rgba(255,255,255,0.04)"
                                  : "rgba(0,0,0,0.03)"
                                : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.backgroundColor =
                                  theme.mode === "dark"
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(0,0,0,0.02)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                (
                                  e.currentTarget as HTMLElement
                                ).style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <td
                              style={{
                                width: "40px",
                                padding: "10px 0 10px 16px",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(txn.id)}
                                style={{
                                  width: "15px",
                                  height: "15px",
                                  cursor: "pointer",
                                  accentColor: theme.accent,
                                }}
                              />
                            </td>

                            <td
                              className="pr-2 py-3"
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
                                cursor: txn.raw_data
                                  ? "pointer"
                                  : "default",
                              }}
                              onClick={() => {
                                if (txn.raw_data) toggleExpand(txn.id);
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {txn.raw_data && (
                                  <ChevronIcon
                                    color={theme.textMuted}
                                    expanded={isExpanded}
                                  />
                                )}
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {txn.description}
                                </span>
                              </div>
                            </td>

                            <td
                              className="px-2 py-3"
                              style={{ width: "140px" }}
                            >
                              <AnimatePresence mode="wait">
                                {isEditing ? (
                                  <motion.div
                                    key="select"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 25,
                                    }}
                                  >
                                    <ThemedSelect
                                      value={txn.category}
                                      onChange={(e) =>
                                        handleCategoryChange(
                                          txn.id,
                                          e.target.value
                                        )
                                      }
                                      onBlur={() =>
                                        setEditingCategory(null)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Escape")
                                          setEditingCategory(null);
                                      }}
                                      autoFocus
                                      style={{
                                        fontSize: "12px",
                                        padding:
                                          "4px 28px 4px 8px",
                                        borderRadius: "8px",
                                      }}
                                    >
                                      {CATEGORIES.map((cat) => (
                                        <option
                                          key={cat}
                                          value={cat}
                                        >
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
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 25,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingCategory(txn.id)
                                      }
                                      style={{
                                        cursor: "pointer",
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                      className="group"
                                    >
                                      <ThemedBadge
                                        color={categoryColor}
                                      >
                                        {txn.category}
                                      </ThemedBadge>
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke={theme.textMuted}
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ opacity: 0, transition: "opacity 150ms" }}
                                        className="group-hover:!opacity-60"
                                      >
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>

                            <td
                              className="px-2 py-3"
                              style={{ whiteSpace: "nowrap" }}
                            >
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

                          <AnimatePresence>
                            {isExpanded && txn.raw_data && (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: 0.25,
                                  ease: [0.25, 0.46, 0.45, 0.94],
                                }}
                                style={{
                                  borderBottom: `1px solid ${theme.border}`,
                                }}
                              >
                                <td colSpan={6} style={{ padding: 0 }}>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: 0.05,
                                    }}
                                    style={{
                                      padding: "12px 20px 16px 56px",
                                      backgroundColor:
                                        theme.mode === "dark"
                                          ? "rgba(255,255,255,0.02)"
                                          : "rgba(0,0,0,0.02)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fill, minmax(220px, 1fr))",
                                        gap: "6px 24px",
                                      }}
                                    >
                                      {Object.entries(txn.raw_data).map(
                                        ([key, value]) => (
                                          <div
                                            key={key}
                                            style={{
                                              display: "flex",
                                              gap: "8px",
                                              alignItems: "baseline",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontFamily: theme.bodyFont,
                                                fontSize: "12px",
                                                color: theme.textMuted,
                                                flexShrink: 0,
                                              }}
                                            >
                                              {key}:
                                            </span>
                                            <span
                                              style={{
                                                fontFamily: theme.bodyFont,
                                                fontSize: "12px",
                                                color: theme.text,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {value || "\u2014"}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </motion.div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </ThemedTable>
              </div>

              {/* Pagination */}
              {meta && meta.total_pages > 0 && (
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderTop: `1px solid ${theme.border}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: theme.bodyFont,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "12px",
                      color: theme.textMuted,
                    }}
                  >
                    Showing {showingStart}&ndash;{showingEnd} of{" "}
                    {meta.total}
                  </span>

                  <div className="flex items-center gap-3">
                    <ThemedButton
                      variant="ghost"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((p) => Math.max(1, p - 1))
                      }
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
                      onClick={() =>
                        setPage((p) =>
                          Math.min(meta.total_pages, p + 1)
                        )
                      }
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

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageInner />
    </Suspense>
  );
}
