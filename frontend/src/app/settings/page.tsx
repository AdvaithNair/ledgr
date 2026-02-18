"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { ThemedPanel, ThemedLabel } from "@/components/dashboards/themed-components";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput } from "@/components/ui/themed-input";
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
} from "@/lib/api";
import type { Card } from "@/types";

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
const emptyForm = { label: "", code: "", color: "#7DD3FC" };

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
    setEditForm({ label: card.label, code: card.code, color: card.color });
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
      if (addingNew) {
        await createCard({
          code: editForm.code.trim(),
          label: editForm.label.trim(),
          color: editForm.color.trim(),
        });
      } else if (editingId) {
        await updateCard(editingId, {
          code: editForm.code.trim(),
          label: editForm.label.trim(),
          color: editForm.color.trim(),
        });
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemedInput
            value={editForm.color}
            onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
            placeholder="#C5A44E"
            style={{ flex: 1 }}
          />
          <ColorSwatch color={editForm.color} borderColor={theme.border} />
        </div>
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

        {/* ═══ 3. Data ═══ */}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Style toggle */}
                <div>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: "12px",
                      color: theme.textMuted,
                      marginBottom: "8px",
                    }}
                  >
                    Style
                  </p>
                  <PillToggle
                    options={[
                      { label: "Arctic", value: "arctic" as ThemeStyle },
                      { label: "Paper", value: "paper" as ThemeStyle },
                    ]}
                    value={style}
                    onChange={setStyle}
                    font={theme.bodyFont}
                    border={theme.border}
                    accentMuted={theme.accentMuted}
                    accent={theme.accent}
                    textMuted={theme.textMuted}
                  />
                </div>

                {/* Mode toggle */}
                <div>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: "12px",
                      color: theme.textMuted,
                      marginBottom: "8px",
                    }}
                  >
                    Mode
                  </p>
                  <PillToggle
                    options={[
                      { label: "Dark", value: "dark" as ThemeMode },
                      { label: "Light", value: "light" as ThemeMode },
                    ]}
                    value={mode}
                    onChange={setMode}
                    font={theme.bodyFont}
                    border={theme.border}
                    accentMuted={theme.accentMuted}
                    accent={theme.accent}
                    textMuted={theme.textMuted}
                  />
                </div>

                {/* Current theme label */}
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "12px",
                    color: theme.textMuted,
                    marginTop: "4px",
                  }}
                >
                  Currently using{" "}
                  <span style={{ color: theme.accent, fontWeight: 500 }}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}{" "}
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </span>
                </p>
              </div>
            </div>
          </ThemedPanel>
        </div>
      </div>
    </PageShell>
  );
}
