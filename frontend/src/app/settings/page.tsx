"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { ThemedPanel, ThemedLabel } from "@/components/dashboards/themed-components";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput } from "@/components/ui/themed-input";
import { ThemedDropdown, type DropdownOption } from "@/components/ui/themed-dropdown";
import { ThemedColorPicker } from "@/components/ui/themed-color-picker";
import { ThemedSkeleton } from "@/components/ui/themed-skeleton";
import { useTheme, type ThemeStyle, type ThemeMode } from "@/components/theme-provider";
import {
  getConfig,
  updateConfig,
  getCards,
  createCard,
  updateCard,
  deleteCard,
  deleteAllTransactions,
  getSummary,
  getBudgets,
  upsertBudget,
  deleteBudget,
} from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";
import type { Card, Budget } from "@/types";

// ── Expand/collapse animation variants ──
const expandVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" as const },
  visible: {
    opacity: 1,
    height: "auto" as const,
    overflow: "hidden" as const,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: "hidden" as const,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

// ── Fade animation for confirmations ──
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ── Blank card form state ──
const emptyForm = {
  label: "",
  code: "",
  color: "#7DD3FC",
  header_pattern: "",
  date_column: "",
  date_format: "",
  description_column: "",
  amount_column: "",
  debit_column: "",
  credit_column: "",
  category_column: "",
  member_column: "",
  skip_negative_amounts: false,
};

type CardForm = typeof emptyForm;

// ── Info tooltip ──
function InfoTooltip({ text, theme: t }: { text: string; theme: { textMuted: string; bg: string; border: string; bodyFont: string; mode: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ display: "inline-block", position: "relative", marginLeft: "4px", verticalAlign: "middle" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "9px",
          fontWeight: 700,
          color: t.textMuted,
          outline: `1px solid ${t.textMuted}`,
          opacity: 0.6,
          transition: "opacity 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
      >
        i
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: t.bg,
            border: `1px solid ${t.border}`,
            boxShadow: t.mode === "dark" ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.1)",
            fontSize: "12px",
            fontFamily: t.bodyFont,
            color: t.textMuted,
            lineHeight: "1.5",
            whiteSpace: "normal",
            width: "220px",
            zIndex: 10,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

// ── Color swatch preview ──
function ColorSwatch({ color, borderColor }: { color: string; borderColor: string }) {
  const isValid = /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
  return (
    <div
      style={{
        width: "16px",
        height: "16px",
        borderRadius: "4px",
        backgroundColor: isValid ? color : "transparent",
        border: isValid ? "none" : `1px dashed ${borderColor}`,
        flexShrink: 0,
      }}
    />
  );
}

// ── Pill toggle ──
function PillToggle<T extends string>({
  options,
  value,
  onChange,
  font,
  border,
  accentMuted,
  accent,
  textMuted,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  font: string;
  border: string;
  accentMuted: string;
  accent: string;
  textMuted: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: "12px",
        border: `1px solid ${border}`,
        overflow: "hidden",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontFamily: font,
              fontSize: "13px",
              fontWeight: 500,
              padding: "8px 20px",
              border: "none",
              cursor: "pointer",
              backgroundColor: active ? accentMuted : "transparent",
              color: active ? accent : textMuted,
              transition: "background-color 200ms, color 200ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// Settings Page
// ═══════════════════════════════════════════

export default function SettingsPage() {
  const { theme, style, mode, setStyle, setMode } = useTheme();

  // ── Name state ──
  const [userName, setUserName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  // ── Cards state ──
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data state ──
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletedAll, setDeletedAll] = useState(false);
  const confirmDeleteAllTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Budgets state ──
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetLimit, setEditBudgetLimit] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // ── Loading ──
  const [loadingConfig, setLoadingConfig] = useState(true);

  // ── Fetch config on mount ──
  useEffect(() => {
    getConfig()
      .then((res) => {
        setUserName(res.data.user_name ?? "");
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  // ── Fetch cards ──
  const fetchCards = useCallback(() => {
    setLoadingCards(true);
    getCards()
      .then((res) => setCards(res.data))
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // ── Fetch budgets ──
  const fetchBudgets = useCallback(() => {
    setLoadingBudgets(true);
    getBudgets()
      .then((res) => setBudgets(res.data))
      .catch(() => {})
      .finally(() => setLoadingBudgets(false));
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Available categories (exclude already-budgeted ones)
  const availableCategories = CATEGORIES.filter(
    (c) => !budgets.some((b) => b.category === c)
  );

  // ── Budget handlers ──
  const handleAddBudget = async () => {
    if (!budgetCategory || !budgetLimit) return;
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) return;
    setSavingBudget(true);
    try {
      await upsertBudget(budgetCategory, limit);
      setBudgetCategory("");
      setBudgetLimit("");
      fetchBudgets();
    } catch {
      // Fail silently
    } finally {
      setSavingBudget(false);
    }
  };

  const handleEditBudget = async (budget: Budget) => {
    const limit = parseFloat(editBudgetLimit);
    if (isNaN(limit) || limit <= 0) return;
    setSavingBudget(true);
    try {
      await upsertBudget(budget.category, limit);
      setEditingBudgetId(null);
      setEditBudgetLimit("");
      fetchBudgets();
    } catch {
      // Fail silently
    } finally {
      setSavingBudget(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteBudget(id);
      fetchBudgets();
    } catch {
      // Fail silently
    }
  };

  // ── Fetch transaction count ──
  useEffect(() => {
    getSummary()
      .then((res) => setTransactionCount(res.data.transaction_count))
      .catch(() => setTransactionCount(0));
  }, []);

  // ── Clean up confirm timer ──
  useEffect(() => {
    return () => {
      if (confirmDeleteAllTimer.current) clearTimeout(confirmDeleteAllTimer.current);
    };
  }, []);

  // ── Auto-revert single card delete confirm after 3s ──
  useEffect(() => {
    if (!deletingId) return;
    const timer = setTimeout(() => setDeletingId(null), 3000);
    return () => clearTimeout(timer);
  }, [deletingId]);

  // ── Name handlers ──
  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await updateConfig({ user_name: userName });
      setSavedName(true);
      setTimeout(() => setSavedName(false), 1000);
    } catch {
      // Fail silently
    } finally {
      setSavingName(false);
    }
  };

  // ── Card handlers ──
  const handleEditCard = (card: Card) => {
    setAddingNew(false);
    setEditingId(card.id);
    setEditForm({
      label: card.label,
      code: card.code,
      color: card.color,
      header_pattern: card.header_pattern ?? "",
      date_column: card.date_column ?? "",
      date_format: card.date_format ?? "",
      description_column: card.description_column ?? "",
      amount_column: card.amount_column ?? "",
      debit_column: card.debit_column ?? "",
      credit_column: card.credit_column ?? "",
      category_column: card.category_column ?? "",
      member_column: card.member_column ?? "",
      skip_negative_amounts: card.skip_negative_amounts,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setEditForm(emptyForm);
  };

  const handleSaveEdit = async () => {
    if (!editForm.label.trim() || !editForm.code.trim()) return;
    setSavingCard(true);
    try {
      const mappingFields = {
        code: editForm.code.trim(),
        label: editForm.label.trim(),
        color: editForm.color.trim(),
        ...(editForm.header_pattern ? { header_pattern: editForm.header_pattern.trim() } : {}),
        ...(editForm.date_column ? { date_column: editForm.date_column.trim() } : {}),
        ...(editForm.date_format ? { date_format: editForm.date_format.trim() } : {}),
        ...(editForm.description_column ? { description_column: editForm.description_column.trim() } : {}),
        ...(editForm.amount_column ? { amount_column: editForm.amount_column.trim() } : {}),
        ...(editForm.debit_column ? { debit_column: editForm.debit_column.trim() } : {}),
        ...(editForm.credit_column ? { credit_column: editForm.credit_column.trim() } : {}),
        ...(editForm.category_column ? { category_column: editForm.category_column.trim() } : {}),
        ...(editForm.member_column ? { member_column: editForm.member_column.trim() } : {}),
        skip_negative_amounts: editForm.skip_negative_amounts,
      };
      if (addingNew) {
        await createCard(mappingFields);
      } else if (editingId) {
        await updateCard(editingId, mappingFields);
      }
      handleCancelEdit();
      fetchCards();
    } catch {
      // Fail silently
    } finally {
      setSavingCard(false);
    }
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setAddingNew(true);
    setEditForm(emptyForm);
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteCard(id);
      setDeletingId(null);
      fetchCards();
    } catch {
      // Fail silently
    }
  };

  // ── Delete all transactions ──
  const handleConfirmDeleteAll = () => {
    setConfirmDeleteAll(true);
    confirmDeleteAllTimer.current = setTimeout(() => {
      setConfirmDeleteAll(false);
    }, 3000);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await deleteAllTransactions();
      setConfirmDeleteAll(false);
      setDeletedAll(true);
      setTransactionCount(0);
      setTimeout(() => setDeletedAll(false), 2000);
    } catch {
      // Fail silently
    } finally {
      setDeletingAll(false);
    }
  };

  // ── CSV mapping fields expand state ──
  const [mappingExpanded, setMappingExpanded] = useState(false);

  // Auto-expand mapping for new cards
  useEffect(() => {
    if (addingNew) setMappingExpanded(true);
    else setMappingExpanded(false);
  }, [addingNew, editingId]);

  // ── Card form (shared by edit and add) ──
  const renderCardForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "12px" }}>
      <div>
        <label
          style={{
            fontFamily: theme.bodyFont,
            fontSize: "12px",
            color: theme.textMuted,
            marginBottom: "4px",
            display: "block",
          }}
        >
          Label
        </label>
        <ThemedInput
          value={editForm.label}
          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="e.g. Amex Gold"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label
            style={{
              fontFamily: theme.bodyFont,
              fontSize: "12px",
              color: theme.textMuted,
              marginBottom: "4px",
              display: "block",
            }}
          >
            Code
            <InfoTooltip text="Short identifier used to match this card during CSV import. Must be unique." theme={theme} />
          </label>
          <ThemedInput
            value={editForm.code}
            onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="e.g. amex"
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: theme.bodyFont,
              fontSize: "12px",
              color: theme.textMuted,
              marginBottom: "4px",
              display: "block",
            }}
          >
            Color
          </label>
          <ThemedColorPicker
            value={editForm.color}
            onChange={(color) => setEditForm((f) => ({ ...f, color }))}
          />
        </div>
      </div>

      {/* CSV Mapping Fields — expandable */}
      <div>
        <button
          onClick={() => setMappingExpanded(!mappingExpanded)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: theme.bodyFont,
            fontSize: "12px",
            color: theme.textMuted,
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{
              transform: mappingExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
          >
            <path d="M4 2l4 4-4 4" />
          </svg>
          CSV Column Mapping
        </button>

        <AnimatePresence>
          {mappingExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, overflow: "hidden" }}
              animate={{ opacity: 1, height: "auto", overflow: "hidden", transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }}
              exit={{ opacity: 0, height: 0, overflow: "hidden", transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>
                      Header Pattern
                      <InfoTooltip text="A unique string found in the CSV header row to auto-detect this card type. E.g. &quot;Transaction Date&quot; for Capital One." theme={theme} />
                    </label>
                    <ThemedInput
                      value={editForm.header_pattern}
                      onChange={(e) => setEditForm((f) => ({ ...f, header_pattern: e.target.value }))}
                      placeholder="e.g. Transaction Date"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>
                      Date Format
                      <InfoTooltip text="strftime format for parsing dates. Leave empty for auto-detection. E.g. &quot;%m/%d/%Y&quot; for 01/15/2025." theme={theme} />
                    </label>
                    <ThemedInput
                      value={editForm.date_format}
                      onChange={(e) => setEditForm((f) => ({ ...f, date_format: e.target.value }))}
                      placeholder="e.g. %m/%d/%Y"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Date Column</label>
                    <ThemedInput
                      value={editForm.date_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, date_column: e.target.value }))}
                      placeholder="e.g. Date"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Description Column</label>
                    <ThemedInput
                      value={editForm.description_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, description_column: e.target.value }))}
                      placeholder="e.g. Description"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Amount Column</label>
                    <ThemedInput
                      value={editForm.amount_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, amount_column: e.target.value }))}
                      placeholder="e.g. Amount"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Debit Column</label>
                    <ThemedInput
                      value={editForm.debit_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, debit_column: e.target.value }))}
                      placeholder="e.g. Debit"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Credit Column</label>
                    <ThemedInput
                      value={editForm.credit_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, credit_column: e.target.value }))}
                      placeholder="e.g. Credit"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Category Column</label>
                    <ThemedInput
                      value={editForm.category_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, category_column: e.target.value }))}
                      placeholder="e.g. Category"
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.bodyFont, fontSize: "11px", color: theme.textMuted, marginBottom: "3px", display: "block" }}>Member Column</label>
                    <ThemedInput
                      value={editForm.member_column}
                      onChange={(e) => setEditForm((f) => ({ ...f, member_column: e.target.value }))}
                      placeholder="e.g. Member Name"
                    />
                  </div>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: theme.bodyFont,
                    fontSize: "12px",
                    color: theme.textMuted,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.skip_negative_amounts}
                    onChange={(e) => setEditForm((f) => ({ ...f, skip_negative_amounts: e.target.checked }))}
                    style={{ accentColor: theme.accent }}
                  />
                  Skip negative amounts (payments/credits)
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
        <ThemedButton
          variant="primary"
          size="sm"
          onClick={handleSaveEdit}
          loading={savingCard}
          disabled={!editForm.label.trim() || !editForm.code.trim()}
        >
          Save
        </ThemedButton>
        <ThemedButton variant="ghost" size="sm" onClick={handleCancelEdit}>
          Cancel
        </ThemedButton>
      </div>
    </div>
  );

  // ── Delete confirmation for a single card ──
  const renderDeleteConfirm = (card: Card) => (
    <AnimatePresence mode="wait">
      {deletingId === card.id ? (
        <motion.div
          key="confirm"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ fontFamily: theme.bodyFont, fontSize: "12px", color: theme.danger }}>
            Confirm?
          </span>
          <ThemedButton variant="danger" size="sm" onClick={() => handleDeleteCard(card.id)}>
            Yes
          </ThemedButton>
          <ThemedButton variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
            No
          </ThemedButton>
        </motion.div>
      ) : (
        <motion.div key="delete" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
          <ThemedButton variant="danger" size="sm" onClick={() => setDeletingId(card.id)}>
            Delete
          </ThemedButton>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <PageShell title="Settings" description="Manage your profile, cards, data, and appearance." maxWidth="md">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* ═══ 1. Your Name ═══ */}
        <div>
          <ThemedLabel className="mb-3">Your Name</ThemedLabel>
          <ThemedPanel>
            <div style={{ padding: theme.panelPadding }}>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "13px",
                  color: theme.textMuted,
                  lineHeight: theme.bodyLineHeight,
                  marginBottom: "16px",
                }}
              >
                Used to filter out other authorized users on your credit cards. Enter your name as it
                appears on statements.
              </p>
              {loadingConfig ? (
                <ThemedSkeleton variant="row" />
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "stretch",
                    borderRadius: "14px",
                    border: savedName ? `2px solid ${theme.success}` : "2px solid transparent",
                    transition: "border-color 300ms",
                  }}
                >
                  <ThemedInput
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                    }}
                    style={{ flex: 1 }}
                  />
                  <ThemedButton variant="primary" onClick={handleSaveName} loading={savingName}>
                    Save
                  </ThemedButton>
                </div>
              )}
            </div>
          </ThemedPanel>
        </div>

        {/* ═══ 2. Cards ═══ */}
        <div>
          <ThemedLabel className="mb-3">Cards</ThemedLabel>
          <ThemedPanel>
            <div style={{ padding: theme.panelPadding }}>
              {loadingCards ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <ThemedSkeleton variant="row" />
                  <ThemedSkeleton variant="row" />
                </div>
              ) : cards.length === 0 ? (
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "13px",
                    color: theme.textMuted,
                    marginBottom: "16px",
                  }}
                >
                  No cards configured yet. Add one to get started.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {cards.map((card, i) => (
                    <div key={card.id}>
                      {/* Card row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 0",
                          borderBottom:
                            i < cards.length - 1 || editingId === card.id
                              ? `1px solid ${theme.border}`
                              : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: card.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: theme.bodyFont,
                              fontSize: "14px",
                              color: theme.text,
                            }}
                          >
                            {card.label}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: "12px",
                              color: theme.textMuted,
                            }}
                          >
                            {card.code}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {editingId !== card.id && (
                            <>
                              <ThemedButton
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCard(card)}
                              >
                                Edit
                              </ThemedButton>
                              {renderDeleteConfirm(card)}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Edit form (expanded) */}
                      <AnimatePresence>
                        {editingId === card.id && (
                          <motion.div
                            variants={expandVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{ paddingBottom: "12px" }}
                          >
                            {renderCardForm()}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new card form */}
              <AnimatePresence>
                {addingNew && (
                  <motion.div
                    variants={expandVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{
                      borderTop: cards.length > 0 ? `1px solid ${theme.border}` : "none",
                      paddingBottom: "4px",
                    }}
                  >
                    {renderCardForm()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add card button */}
              {!addingNew && (
                <div style={{ marginTop: cards.length > 0 ? "12px" : "0" }}>
                  <ThemedButton variant="secondary" size="sm" onClick={handleStartAdd}>
                    Add Card
                  </ThemedButton>
                </div>
              )}
            </div>
          </ThemedPanel>
        </div>

        {/* ═══ 3. Budgets ═══ */}
        <div>
          <ThemedLabel className="mb-3">Budgets</ThemedLabel>
          <ThemedPanel>
            <div style={{ padding: theme.panelPadding }}>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "13px",
                  color: theme.textMuted,
                  lineHeight: theme.bodyLineHeight,
                  marginBottom: "16px",
                }}
              >
                Set monthly spending limits for categories you want to track.
                Leave empty for categories you don&apos;t want to budget.
              </p>

              {loadingBudgets ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <ThemedSkeleton variant="row" />
                  <ThemedSkeleton variant="row" />
                </div>
              ) : (
                <>
                  {/* Active budgets */}
                  {budgets.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {budgets.map((budget, i) => (
                        <div key={budget.id}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 0",
                              borderBottom:
                                i < budgets.length - 1
                                  ? `1px solid ${theme.border}`
                                  : "none",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: theme.bodyFont,
                                fontSize: "14px",
                                color: theme.text,
                              }}
                            >
                              {budget.category}
                            </span>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <AnimatePresence mode="wait">
                                {editingBudgetId === budget.id ? (
                                  <motion.div
                                    key="edit"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                  >
                                    <div style={{ position: "relative", width: "100px" }}>
                                      <span
                                        style={{
                                          position: "absolute",
                                          left: "10px",
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          fontFamily: "var(--font-mono, monospace)",
                                          fontSize: "13px",
                                          color: theme.textMuted,
                                          pointerEvents: "none",
                                        }}
                                      >
                                        $
                                      </span>
                                      <ThemedInput
                                        value={editBudgetLimit}
                                        onChange={(e) => setEditBudgetLimit(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleEditBudget(budget);
                                          if (e.key === "Escape") {
                                            setEditingBudgetId(null);
                                            setEditBudgetLimit("");
                                          }
                                        }}
                                        onBlur={() => {
                                          const v = parseFloat(editBudgetLimit);
                                          if (!isNaN(v) && v > 0) {
                                            setEditBudgetLimit(v.toFixed(2));
                                          }
                                        }}
                                        placeholder="0.00"
                                        style={{ paddingLeft: "22px", width: "100%" }}
                                        autoFocus
                                      />
                                    </div>
                                    <ThemedButton
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleEditBudget(budget)}
                                      loading={savingBudget}
                                      disabled={!editBudgetLimit || parseFloat(editBudgetLimit) <= 0}
                                    >
                                      Save
                                    </ThemedButton>
                                    <ThemedButton
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingBudgetId(null);
                                        setEditBudgetLimit("");
                                      }}
                                    >
                                      Cancel
                                    </ThemedButton>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="display"
                                    variants={fadeVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--font-mono, monospace)",
                                        fontSize: "13px",
                                        color: theme.textMuted,
                                      }}
                                    >
                                      ${budget.monthly_limit.toFixed(2)}/mo
                                    </span>
                                    <ThemedButton
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingBudgetId(budget.id);
                                        setEditBudgetLimit(budget.monthly_limit.toFixed(2));
                                      }}
                                    >
                                      Edit
                                    </ThemedButton>
                                    <ThemedButton
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDeleteBudget(budget.id)}
                                    >
                                      &times;
                                    </ThemedButton>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new budget */}
                  {availableCategories.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: budgets.length > 0 ? "16px" : "0",
                        flexWrap: "wrap",
                      }}
                    >
                      <ThemedDropdown
                        options={[
                          { value: "", label: "Select category" },
                          ...availableCategories.map((cat) => ({ value: cat, label: cat })),
                        ]}
                        value={budgetCategory}
                        onChange={setBudgetCategory}
                        placeholder="Select category"
                        style={{ minWidth: "160px" }}
                      />

                      <div style={{ position: "relative", width: "100px" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: "13px",
                            color: theme.textMuted,
                            pointerEvents: "none",
                          }}
                        >
                          $
                        </span>
                        <ThemedInput
                          value={budgetLimit}
                          onChange={(e) => setBudgetLimit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddBudget();
                          }}
                          onBlur={() => {
                            const v = parseFloat(budgetLimit);
                            if (!isNaN(v) && v > 0) {
                              setBudgetLimit(v.toFixed(2));
                            }
                          }}
                          placeholder="0.00"
                          style={{ paddingLeft: "22px", width: "100%" }}
                        />
                      </div>

                      <ThemedButton
                        variant="primary"
                        size="sm"
                        onClick={handleAddBudget}
                        loading={savingBudget}
                        disabled={!budgetCategory || !budgetLimit || parseFloat(budgetLimit) <= 0}
                      >
                        Add
                      </ThemedButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </ThemedPanel>
        </div>

        {/* ═══ 4. Data ═══ */}
        <div>
          <ThemedLabel className="mb-3">Data</ThemedLabel>
          <ThemedPanel>
            <div style={{ padding: theme.panelPadding }}>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "13px",
                  color: theme.textMuted,
                  lineHeight: theme.bodyLineHeight,
                  marginBottom: "16px",
                }}
              >
                {transactionCount !== null
                  ? `You have ${transactionCount.toLocaleString()} transaction${transactionCount !== 1 ? "s" : ""} stored locally.`
                  : "Loading transaction data..."}
              </p>

              <AnimatePresence mode="wait">
                {deletedAll ? (
                  <motion.p
                    key="deleted"
                    variants={fadeVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: "13px",
                      color: theme.success,
                      fontWeight: 500,
                    }}
                  >
                    All transactions deleted successfully.
                  </motion.p>
                ) : confirmDeleteAll ? (
                  <motion.div
                    key="confirm"
                    variants={fadeVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                  >
                    <p
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "13px",
                        color: theme.danger,
                        fontWeight: 500,
                      }}
                    >
                      Are you sure? All data will be lost.
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <ThemedButton
                        variant="danger"
                        size="sm"
                        onClick={handleDeleteAll}
                        loading={deletingAll}
                      >
                        Confirm
                      </ThemedButton>
                      <ThemedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmDeleteAll(false);
                          if (confirmDeleteAllTimer.current)
                            clearTimeout(confirmDeleteAllTimer.current);
                        }}
                      >
                        Cancel
                      </ThemedButton>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="button" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                    <ThemedButton
                      variant="danger"
                      onClick={handleConfirmDeleteAll}
                      disabled={transactionCount === 0}
                    >
                      Delete All Transactions
                    </ThemedButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ThemedPanel>
        </div>

        {/* ═══ 4. Theme ═══ */}
        <div>
          <ThemedLabel className="mb-3">Theme</ThemedLabel>
          <ThemedPanel>
            <div style={{ padding: theme.panelPadding }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                {(
                  [
                    { s: "arctic" as ThemeStyle, m: "dark" as ThemeMode, label: "Arctic Dark", bg: "#0A0A0F", surface: "#141419", accent: "#7DD3FC" },
                    { s: "arctic" as ThemeStyle, m: "light" as ThemeMode, label: "Arctic Light", bg: "#F8FAFC", surface: "#FFFFFF", accent: "#0EA5E9" },
                    { s: "paper" as ThemeStyle, m: "dark" as ThemeMode, label: "Paper Dark", bg: "#1A1A1A", surface: "#242424", accent: "#D4A574" },
                    { s: "paper" as ThemeStyle, m: "light" as ThemeMode, label: "Paper Light", bg: "#FAF8F5", surface: "#FFFFFF", accent: "#8B6914" },
                  ] as const
                ).map((t) => {
                  const isActive = style === t.s && mode === t.m;
                  return (
                    <button
                      key={`${t.s}-${t.m}`}
                      onClick={() => {
                        setStyle(t.s);
                        setMode(t.m);
                      }}
                      style={{
                        cursor: "pointer",
                        border: isActive
                          ? `2px solid ${theme.accent}`
                          : `1px solid ${theme.border}`,
                        borderRadius: "12px",
                        padding: "16px",
                        backgroundColor: t.bg,
                        transition: "border-color 200ms",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "14px",
                            borderRadius: "4px",
                            backgroundColor: t.surface,
                          }}
                        />
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "4px",
                            backgroundColor: t.accent,
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontFamily: theme.bodyFont,
                          fontSize: "13px",
                          fontWeight: 500,
                          color: t.m === "dark" ? "#E5E5E5" : "#1A1A1A",
                        }}
                      >
                        {t.label}
                      </p>
                      {isActive && (
                        <p
                          style={{
                            fontFamily: theme.bodyFont,
                            fontSize: "10px",
                            color: t.accent,
                            marginTop: "4px",
                          }}
                        >
                          Active
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </ThemedPanel>
        </div>
      </div>
    </PageShell>
  );
}
