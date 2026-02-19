"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

const PRESET_COLORS = [
  "#C5A44E", // Amex Gold
  "#0066B2", // Citi Blue
  "#D42427", // Capital One Red
  "#2D9CDB", // Ocean Blue
  "#27AE60", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

interface ThemedColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ThemedColorPicker({
  value,
  onChange,
  className,
  style: styleProp,
}: ThemedColorPickerProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleHexSubmit = () => {
    const hex = hexInput.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    } else if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(`#${hex}`);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", ...styleProp }} className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          fontFamily: theme.bodyFont,
          fontSize: "14px",
          lineHeight: "1.5",
          borderRadius: "12px",
          padding: "12px 16px",
          outline: "none",
          cursor: "pointer",
          textAlign: "left",
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF",
          border: `1px solid ${open ? theme.accent : isDark ? "rgba(255, 255, 255, 0.08)" : theme.border}`,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "border-color 200ms",
        }}
      >
        <span
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "6px",
            backgroundColor: value || "#666",
            flexShrink: 0,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        />
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "13px" }}>
          {value || "#000000"}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 4px)",
            left: 0,
            width: "240px",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : theme.border}`,
            backgroundColor: isDark ? theme.surface : "#FFFFFF",
            boxShadow: isDark
              ? "0 8px 24px rgba(0,0,0,0.4)"
              : "0 8px 24px rgba(0,0,0,0.1)",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setHexInput(color);
                  setOpen(false);
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: color,
                  border:
                    value === color
                      ? `2px solid ${theme.text}`
                      : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                  outline: "none",
                  transition: "transform 100ms",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "scale(1.1)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleHexSubmit();
              }}
              placeholder="#000000"
              style={{
                flex: 1,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "13px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : theme.border}`,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                color: theme.text,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => {
                handleHexSubmit();
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: theme.accent,
                color: "#FFFFFF",
                fontFamily: theme.bodyFont,
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
