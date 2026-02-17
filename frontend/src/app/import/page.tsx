"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { importCSV, getCards, getImportHistory } from "@/lib/api";
import type { Card as CardType, ImportResult, ImportRecord } from "@/types";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ImportPage() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCards()
      .then((res) => setCards(res.data))
      .catch(() => {});
    getImportHistory()
      .then((res) => setHistory(res.data))
      .catch(() => {});
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setError("");
    setResult(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setResult(null);

    try {
      const res = await importCSV(file, selectedCard || undefined);
      setResult(res.data);
      setStatus("success");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh history
      getImportHistory()
        .then((r) => setHistory(r.data))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <PageHeader
        title="Import"
        description="Upload CSV files from your credit cards"
      />

      {/* Drop Zone */}
      <Card className="relative">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-white/40 bg-white/5"
              : file
                ? "border-white/20 bg-white/[0.02]"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-white">{file.name}</p>
                <p className="mt-1 text-xs text-white/40">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="text-xs text-white/40 transition-colors hover:text-white/60"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/60">
                  Drag & drop your CSV here
                </p>
                <p className="mt-1 text-xs text-white/30">
                  or click to browse
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card selector + Upload button */}
        {file && (
          <div className="mt-4 flex items-center gap-3">
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/20"
            >
              <option value="">Auto-detect card</option>
              {cards.map((card) => (
                <option key={card.id} value={card.code}>
                  {card.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleUpload}
              disabled={status === "uploading"}
              className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "uploading" ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Importing...
                </span>
              ) : (
                "Import"
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Error */}
      {status === "error" && error && (
        <Card className="mt-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Success Result */}
      {status === "success" && result && (
        <Card className="mt-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-emerald-400">Import complete</p>
              <p className="mt-1 text-sm text-white/50">
                {result.file_name} — {result.card_label}
              </p>
            </div>
            <Badge color="#10B981">{result.new_count} new</Badge>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase text-white/40">Parsed</p>
              <p className="font-mono text-lg text-white">{result.total_parsed}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-white/40">New</p>
              <p className="font-mono text-lg text-emerald-400">{result.new_count}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-white/40">Duplicates</p>
              <p className="font-mono text-lg text-white/50">{result.duplicate_count}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-white/40">Skipped</p>
              <p className="font-mono text-lg text-white/50">{result.skipped_user_count}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Import History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-medium text-white">Import History</h2>
          <div className="space-y-2">
            {history.map((record) => (
              <Card key={record.id} padding="sm" className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{record.file_name}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {record.card} — {new Date(record.imported_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-white/60">
                    {record.transaction_count} txns
                  </span>
                  {record.duplicate_count > 0 && (
                    <span className="text-white/30">
                      {record.duplicate_count} dupes
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
