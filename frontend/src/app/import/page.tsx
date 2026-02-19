"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import { useTheme } from "@/components/theme-provider";
import type { ThemeConfig } from "@/components/theme-provider";
import { PageShell } from "@/components/page-shell";
import {
  ThemedPanel,
  ThemedLabel,
  ThemedTable,
  ThemedTh,
  ThemedTd,
} from "@/components/dashboards/themed-components";
import { ThemedButton } from "@/components/ui/themed-button";
import { ThemedInput, ThemedSelect } from "@/components/ui/themed-input";
import {
  getCards,
  importCSV,
  getImportHistory,
  deleteImport,
} from "@/lib/api";
import { getCardColor, getCardLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { CoverageTracker } from "@/components/coverage-tracker";
import { getMonthly } from "@/lib/api";
import type { Card, ImportResult, ImportRecord, MonthlyData } from "@/types";

type ImportState = "idle" | "previewing" | "uploading" | "done";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectCardFromHeaders(headers: string[], cards: Card[]): Card | null {
  const joined = headers.join(",").toLowerCase();
  for (const card of cards) {
    if (!card.header_pattern) continue;
    const keywords = card.header_pattern
      .split(",")
      .map((k) => k.trim().toLowerCase());
    if (keywords.every((kw) => joined.includes(kw))) return card;
  }
  return null;
}

export default function ImportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ImportState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [cardCode, setCardCode] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [deletingImportId, setDeletingImportId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // CSV preview state
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);

  // Auto-detect card state
  const [detectedCard, setDetectedCard] = useState<Card | null>(null);
  const [showCardDropdown, setShowCardDropdown] = useState(false);

  useEffect(() => {
    getCards()
      .then((res) => setCards(res.data))
      .catch(() => {});
    fetchHistory();
    getMonthly()
      .then((res) => setMonthlyData(res.data))
      .catch(() => {});
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getImportHistory();
      setHistory(res.data);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteImport = async (id: string) => {
    setDeletingImportId(id);
    try {
      await deleteImport(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
    } catch {
      // silent
    } finally {
      setDeletingImportId(null);
    }
  };

  const handleFile = useCallback(
    (f: File) => {
      if (!f.name.toLowerCase().endsWith(".csv")) {
        setError("Only CSV files are supported.");
        return;
      }
      setFile(f);
      setError(null);
      setResult(null);

      // Parse CSV for preview
      Papa.parse<Record<string, string>>(f, {
        header: true,
        preview: 21,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          setPreviewHeaders(headers);
          setPreviewRows(results.data.slice(0, 20));

          // Auto-detect card
          const detected = detectCardFromHeaders(headers, cards);
          setDetectedCard(detected);
          if (detected) {
            setCardCode(detected.code);
            setShowCardDropdown(false);
          } else {
            setShowCardDropdown(true);
            setCardCode("");
          }

          // Count total rows (re-parse without preview limit)
          Papa.parse(f, {
            header: true,
            skipEmptyLines: true,
            complete: (fullResults) => {
              setTotalRowCount(fullResults.data.length);
            },
          });

          setState("previewing");
        },
        error: () => {
          setError("Failed to parse CSV file.");
        },
      });
    },
    [cards]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const resetAll = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setTotalRowCount(0);
    setDetectedCard(null);
    setShowCardDropdown(false);
    setCardCode("");
    setState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setState("uploading");
    setError(null);
    setResult(null);
    try {
      const res = await importCSV(file, cardCode || undefined);
      setResult(res.data);
      setState("done");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      );
      setState("previewing");
    }
  };

  const isAllDuplicates =
    result &&
    result.new_count === 0 &&
    result.duplicate_count > 0;

  return (
    <PageShell
      title="Import"
      description="Drop a CSV to add transactions"
      maxWidth="lg"
    >
      {/* ── Drop Zone (only visible when idle) ── */}
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ThemedPanel style={{ padding: theme.panelPadding }}>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: dragOver
                    ? `2px solid ${theme.accent}`
                    : `2px dashed ${theme.border}`,
                  borderRadius: "12px",
                  padding: "48px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backgroundColor: dragOver
                    ? `color-mix(in srgb, ${theme.accent} 3%, transparent)`
                    : "transparent",
                  transition: "border-color 200ms, background-color 200ms",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={onFileInputChange}
                  style={{ display: "none" }}
                />
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.textMuted}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: "16px" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "16px",
                    color: theme.text,
                    fontWeight: 500,
                  }}
                >
                  Drop CSV here
                </p>
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "13px",
                    color: theme.textMuted,
                    marginTop: "4px",
                  }}
                >
                  or click to browse
                </p>
              </div>
            </ThemedPanel>
          </motion.div>
        )}

        {/* ── Preview State ── */}
        {state === "previewing" && file && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ThemedPanel style={{ padding: theme.panelPadding }}>
              {/* File info header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.accent}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div>
                    <p
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "14px",
                        color: theme.text,
                        fontWeight: 500,
                      }}
                    >
                      {file.name}
                    </p>
                    <p
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "12px",
                        color: theme.textMuted,
                        marginTop: "1px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {totalRowCount.toLocaleString()} rows &middot;{" "}
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card detection */}
              <div
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {detectedCard && !showCardDropdown ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: detectedCard.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "13px",
                        color: theme.text,
                        fontWeight: 500,
                      }}
                    >
                      {detectedCard.label}
                    </span>
                    <span
                      style={{
                        fontFamily: theme.bodyFont,
                        fontSize: "11px",
                        color: theme.textMuted,
                        backgroundColor:
                          theme.mode === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      auto-detected
                    </span>
                    <button
                      onClick={() => setShowCardDropdown(true)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: theme.bodyFont,
                        fontSize: "12px",
                        color: theme.accent,
                        padding: "2px 4px",
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flex: 1,
                    }}
                  >
                    {!detectedCard && (
                      <span
                        style={{
                          fontFamily: theme.bodyFont,
                          fontSize: "12px",
                          color: theme.textMuted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Could not auto-detect card type
                      </span>
                    )}
                    <ThemedSelect
                      value={cardCode}
                      onChange={(e) => setCardCode(e.target.value)}
                      style={{ maxWidth: "220px" }}
                    >
                      <option value="">Select card...</option>
                      {cards.map((card) => (
                        <option key={card.id} value={card.code}>
                          {card.label}
                        </option>
                      ))}
                    </ThemedSelect>
                    {detectedCard && (
                      <button
                        onClick={() => {
                          setShowCardDropdown(false);
                          setCardCode(detectedCard.code);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: theme.bodyFont,
                          fontSize: "12px",
                          color: theme.textMuted,
                        }}
                      >
                        Use detected
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: "8px",
                  border: `1px solid ${theme.border}`,
                }}
              >
                <ThemedTable>
                  <thead>
                    <tr>
                      {previewHeaders.map((header) => (
                        <th
                          key={header}
                          style={{
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                            padding: "8px 12px",
                            textAlign: "left",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: 400,
                            color: theme.labelColor,
                            fontFamily: theme.bodyFont,
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.2,
                          delay: i * 0.02,
                        }}
                        style={{
                          borderBottom: `1px solid ${theme.border}`,
                        }}
                      >
                        {previewHeaders.map((header) => {
                          const value = row[header] ?? "";
                          const isNumeric =
                            value !== "" && !isNaN(Number(value.replace(/[,$]/g, "")));
                          return (
                            <td
                              key={header}
                              style={{
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                                padding: "6px 12px",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textAlign: isNumeric ? "right" : "left",
                                fontVariantNumeric: isNumeric
                                  ? "tabular-nums"
                                  : undefined,
                                fontFamily: isNumeric
                                  ? `"JetBrains Mono", ${theme.bodyFont}`
                                  : theme.bodyFont,
                                color: theme.text,
                              }}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </tbody>
                </ThemedTable>
              </div>
              {totalRowCount > 20 && (
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    fontSize: "11px",
                    color: theme.textMuted,
                    marginTop: "8px",
                    textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Showing 20 of {totalRowCount.toLocaleString()} rows
                </p>
              )}

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "16px",
                }}
              >
                <ThemedButton variant="ghost" onClick={resetAll}>
                  Cancel
                </ThemedButton>
                <ThemedButton
                  variant="primary"
                  onClick={handleImport}
                >
                  Import
                </ThemedButton>
              </div>
            </ThemedPanel>
          </motion.div>
        )}

        {/* ── Uploading state ── */}
        {state === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ThemedPanel
              style={{
                padding: "48px",
                textAlign: "center" as const,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: `2px solid ${theme.border}`,
                  borderTopColor: theme.accent,
                  borderRadius: "50%",
                  animation: "importSpin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "14px",
                  color: theme.textMuted,
                }}
              >
                Importing transactions...
              </p>
              <style>{`@keyframes importSpin { to { transform: rotate(360deg); } }`}</style>
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result Card ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ marginTop: "24px" }}
          >
            <ThemedPanel
              style={{
                padding: theme.panelPadding,
                borderLeft: `3px solid ${isAllDuplicates ? theme.accent : theme.success}`,
              }}
            >
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "14px",
                  color: isAllDuplicates ? theme.accent : theme.success,
                  fontWeight: 500,
                  marginBottom: "16px",
                }}
              >
                {isAllDuplicates
                  ? "All transactions in this file were already imported"
                  : `Successfully imported to ${result.card_label}`}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "16px",
                }}
              >
                <StatBlock
                  label="Total Parsed"
                  value={result.total_parsed}
                  theme={theme}
                />
                <StatBlock
                  label="New"
                  value={result.new_count}
                  theme={theme}
                />
                <StatBlock
                  label="Duplicates"
                  value={result.duplicate_count}
                  theme={theme}
                />
                <StatBlock
                  label="Skipped (User)"
                  value={result.skipped_user_count}
                  theme={theme}
                />
              </div>

              {/* Post-import action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                <ThemedButton variant="ghost" onClick={resetAll}>
                  Import Another
                </ThemedButton>
                <ThemedButton
                  variant="primary"
                  onClick={() => router.push("/transactions")}
                >
                  View Transactions
                </ThemedButton>
              </div>
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Card ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ marginTop: "24px" }}
          >
            <ThemedPanel
              style={{
                padding: theme.panelPadding,
                borderLeft: `3px solid ${theme.danger}`,
              }}
            >
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "14px",
                  color: theme.danger,
                }}
              >
                {error}
              </p>
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Coverage Tracker ── */}
      {cards.length > 0 && monthlyData && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginTop: "24px" }}
        >
          <ThemedLabel className="mb-4">Data Coverage</ThemedLabel>
          <ThemedPanel style={{ padding: theme.panelPadding }}>
            <CoverageTracker cards={cards} monthlyData={monthlyData} />
          </ThemedPanel>
        </motion.div>
      )}

      {/* ── Import History ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ marginTop: "40px" }}
      >
        <ThemedLabel className="mb-4">Import History</ThemedLabel>

        {loadingHistory ? (
          <ThemedPanel style={{ padding: theme.panelPadding }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "20px",
                    borderRadius: "6px",
                    backgroundColor: theme.surface,
                    opacity: 0.5,
                    animation: "importPulse 2s ease-in-out infinite",
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes importPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}</style>
          </ThemedPanel>
        ) : history.length === 0 ? (
          <ThemedPanel
            style={{
              padding: "40px",
              textAlign: "center" as const,
            }}
          >
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: "14px",
                color: theme.textMuted,
              }}
            >
              No imports yet
            </p>
          </ThemedPanel>
        ) : (
          <ThemedPanel style={{ padding: theme.panelPadding }}>
            <ThemedTable>
              <thead>
                <tr>
                  <ThemedTh>Filename</ThemedTh>
                  <ThemedTh>Card</ThemedTh>
                  <ThemedTh>Date</ThemedTh>
                  <ThemedTh numeric>Txns</ThemedTh>
                  <ThemedTh numeric>Duplicates</ThemedTh>
                  <ThemedTh>{" "}</ThemedTh>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    style={{
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                    className="transition-colors duration-150"
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLElement
                      ).style.backgroundColor =
                        theme.mode === "dark"
                          ? "rgba(255,255,255,0.02)"
                          : "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLElement
                      ).style.backgroundColor = "transparent";
                    }}
                  >
                    <ThemedTd>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          maxWidth: "200px",
                        }}
                      >
                        {record.file_name}
                      </span>
                    </ThemedTd>
                    <ThemedTd>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: getCardColor(
                              cards,
                              record.card
                            ),
                            flexShrink: 0,
                          }}
                        />
                        {getCardLabel(cards, record.card)}
                      </span>
                    </ThemedTd>
                    <ThemedTd>
                      {formatDate(record.imported_at)}
                    </ThemedTd>
                    <ThemedTd numeric>
                      {record.transaction_count}
                    </ThemedTd>
                    <ThemedTd numeric>
                      {record.duplicate_count}
                    </ThemedTd>
                    <ThemedTd>
                      {deleteConfirmId === record.id ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <button
                            onClick={() => handleDeleteImport(record.id)}
                            disabled={deletingImportId === record.id}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: theme.bodyFont,
                              fontSize: "11px",
                              color: theme.danger,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              opacity: deletingImportId === record.id ? 0.5 : 1,
                            }}
                          >
                            {deletingImportId === record.id
                              ? "..."
                              : `Delete ${record.transaction_count} txns`}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: theme.bodyFont,
                              fontSize: "11px",
                              color: theme.textMuted,
                              padding: "2px 4px",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(record.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: theme.textMuted,
                            padding: "4px",
                            borderRadius: "4px",
                            opacity: 0.5,
                            transition: "opacity 150ms",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.opacity = "0.5";
                          }}
                          title="Delete import"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </ThemedTd>
                  </motion.tr>
                ))}
              </tbody>
            </ThemedTable>
          </ThemedPanel>
        )}
      </motion.div>
    </PageShell>
  );
}

function StatBlock({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: ThemeConfig;
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: theme.bodyFont,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: theme.labelColor,
          marginBottom: "4px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: theme.bodyFont,
          fontVariantNumeric: "tabular-nums",
          fontSize: "24px",
          fontWeight: 600,
          color: theme.text,
        }}
      >
        {value}
      </p>
    </div>
  );
}
