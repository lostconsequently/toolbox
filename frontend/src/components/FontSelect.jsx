import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { fontRegistry } from "../config/fontRegistry";
import { useLanguage } from "../context/LanguageContext";
import "../styles/hoverCard.css";

const fontKeys = Object.keys(fontRegistry);

export default function FontSelect({ value, onChange, compactMode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(fontKeys.indexOf(value), 0),
  );
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = "font-select-listbox";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [open]);

  const selected = fontRegistry[value] || fontRegistry.segoe;

  const closeAndFocusButton = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const selectAt = (index) => {
    const key = fontKeys[index];
    onChange(key);
    closeAndFocusButton();
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveIndex(Math.max(fontKeys.indexOf(value), 0));
      setOpen(true);
    }
  };

  const handleOptionKeyDown = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(index + 1, fontKeys.length - 1);
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(index - 1, 0);
      setActiveIndex(prev);
      optionRefs.current[prev]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectAt(index);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeAndFocusButton();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "320px",
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          setActiveIndex(Math.max(fontKeys.indexOf(value), 0));
          setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        style={{
          width: "100%",
          height: compactMode ? "36px" : "42px",
          boxSizing: "border-box",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0 12px",
          fontSize: "14px",
          fontFamily: selected.value,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{selected.label}</span>

        <ChevronDown
          size={16}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("settings.selectFont")}
          tabIndex={-1}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: "320px",
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            zIndex: 20,
          }}
        >
          {fontKeys.map((key, index) => {
            const font = fontRegistry[key];
            const isSelected = key === value;

            return (
              <div
                key={key}
                ref={(el) => (optionRefs.current[index] = el)}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => selectAt(index)}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
                onMouseEnter={() => setActiveIndex(index)}
                className="hover-card"
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: isSelected
                    ? "var(--surface-hover)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "3px solid var(--primary)"
                    : "3px solid transparent",
                  outline: "none",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--subtle)",
                    marginBottom: "2px",
                  }}
                >
                  {font.label}
                </div>

                <div
                  style={{
                    fontFamily: font.value,
                    fontSize: "14px",
                    color: "var(--text)",
                  }}
                >
                  Aa Bb Cc — Toolbox
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
