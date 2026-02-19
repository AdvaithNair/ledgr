"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/components/theme-provider";

export interface DropdownOption {
  value: string;
  label: string;
}

interface ThemedDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ThemedDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  style: styleProp,
}: ThemedDropdownProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  useEffect(() => {
    if (open && highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  return (
    <div ref={containerRef} style={{ position: "relative", ...styleProp }} className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setHighlightedIndex(options.findIndex((o) => o.value === value));
        }}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          fontFamily: theme.bodyFont,
          fontSize: "14px",
          lineHeight: "1.5",
          borderRadius: "12px",
          padding: "12px 40px 12px 16px",
          outline: "none",
          cursor: "pointer",
          textAlign: "left",
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF",
          border: `1px solid ${open ? theme.accent : isDark ? "rgba(255, 255, 255, 0.08)" : theme.border}`,
          color: selectedOption ? theme.text : theme.textMuted,
          boxShadow: open
            ? isDark
              ? `0 0 0 1px color-mix(in srgb, ${theme.accent} 20%, transparent)`
              : "none"
            : "none",
          transition: "border-color 200ms, box-shadow 200ms",
        }}
      >
        {selectedOption?.label ?? placeholder}
      </button>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: open ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)",
          pointerEvents: "none",
          transition: "transform 200ms",
        }}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke={theme.textMuted}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: "240px",
            overflowY: "auto",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : theme.border}`,
            backgroundColor: isDark ? theme.surface : "#FFFFFF",
            boxShadow: isDark
              ? "0 8px 24px rgba(0,0,0,0.4)"
              : "0 8px 24px rgba(0,0,0,0.1)",
            padding: "4px",
          }}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const isHighlighted = i === highlightedIndex;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: theme.bodyFont,
                  fontSize: "14px",
                  color: isSelected ? theme.accent : theme.text,
                  backgroundColor: isHighlighted
                    ? isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background-color 100ms",
                }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
