"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ThemedSelect } from "@/components/ui/themed-input";
import { getCards, importCSV, getImportHistory } from "@/lib/api";
import { getCardColor, getCardLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Card, ImportResult, ImportRecord } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [cardCode, setCardCode] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getCards()
      .then((res) => setCards(res.data))
      .catch(() => {});
    fetchHistory();
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

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }, []);

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

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await importCSV(file, cardCode || undefined);
      setResult(res.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageShell
      title="Import"
      description="Drop a CSV to add transactions"
      maxWidth="lg"
    >
      {/* ── Drop Zone ── */}
      <motion.div
        animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <ThemedPanel style={{ padding: theme.panelPadding }}>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !file && fileInputRef.current?.click()}
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
              cursor: file ? "default" : "pointer",
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

            {!file ? (
              <>
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
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  maxWidth: "400px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: "14px",
                      color: theme.text,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </p>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: "12px",
                      color: theme.textMuted,
                      marginTop: "2px",
                    }}
                  >
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <ThemedButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  Remove
                </ThemedButton>
              </div>
            )}
          </div>

          {/* Card selector + Import button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <ThemedSelect
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
              >
                <option value="">Auto-detect card</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.code}>
                    {card.label}
                  </option>
                ))}
              </ThemedSelect>
            </div>
            <ThemedButton
              variant="primary"
              disabled={!file}
              loading={importing}
              onClick={handleImport}
            >
              Import
            </ThemedButton>
          </div>
        </ThemedPanel>
      </motion.div>

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
                borderLeft: `3px solid ${theme.success}`,
              }}
            >
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: "14px",
                  color: theme.success,
                  fontWeight: 500,
                  marginBottom: "16px",
                }}
              >
                Successfully imported to {result.card_label}
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
