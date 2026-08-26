import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_PRESETS = [
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#0891b2",
  "#475569",
  "#18181b",
];

export default function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  compactMode = false,
  presets = DEFAULT_PRESETS,
  hint,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const nativeInputRef = useRef(null);

  const isValid = HEX_COLOR_PATTERN.test(value);
  const swatchColor = isValid ? value : "var(--surface)";
  const triggerHeight = compactMode ? "32px" : "36px";

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleHexChange = (event) => {
    const next = event.target.value;

    onChange(HEX_COLOR_PATTERN.test(next) ? next.toUpperCase() : next);
  };

  const selectPreset = (preset) => {
    onChange(preset.toUpperCase());
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            color: "var(--subtle)",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: triggerHeight,
          boxSizing: "border-box",
          padding: "0 10px 0 6px",
          background: "var(--surface)",
          border: `1px solid ${value && !isValid ? "var(--status-error)" : "var(--border)"}`,
          borderRadius: "8px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            width: "20px",
            height: "20px",
            flexShrink: 0,
            borderRadius: "5px",
            border: "1px solid var(--border)",
            boxShadow: "inset 0 0 0 2px var(--card)",
            background: swatchColor,
          }}
        />

        <span
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: compactMode ? "12px" : "13px",
            color: "var(--text)",
            letterSpacing: "0.3px",
          }}
        >
          {value || "#______"}
        </span>

        <ChevronDown
          size={14}
          style={{
            marginLeft: "2px",
            color: "var(--subtle)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      <input
        ref={nativeInputRef}
        type="color"
        value={isValid ? value : "#000000"}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          border: "none",
          padding: 0,
        }}
      />

      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 30,
            width: "184px",
            padding: "12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "6px",
              marginBottom: "10px",
            }}
          >
            {presets.map((preset) => {
              const isSelected =
                isValid && value.toUpperCase() === preset.toUpperCase();

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  title={preset}
                  aria-label={preset}
                  aria-pressed={isSelected}
                  style={{
                    width: "22px",
                    height: "22px",
                    padding: 0,
                    borderRadius: "6px",
                    border: isSelected
                      ? "2px solid var(--text)"
                      : "1px solid var(--border)",
                    background: preset,
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>

          <input
            type="text"
            value={value}
            onChange={handleHexChange}
            placeholder="#3B82F6"
            spellCheck={false}
            autoFocus
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--card)",
              color: "var(--text)",
              border: `1px solid ${value && !isValid ? "var(--status-error)" : "var(--border)"}`,
              borderRadius: "6px",
              padding: "0 8px",
              height: "30px",
              fontSize: "12px",
              fontFamily: "var(--mono, monospace)",
              letterSpacing: "0.3px",
              marginBottom: "8px",
            }}
          />

          <button
            type="button"
            onClick={() => nativeInputRef.current?.click()}
            className="hover-card"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "transparent",
              color: "var(--subtle)",
              border: "1px dashed var(--border)",
              borderRadius: "6px",
              padding: "5px 8px",
              fontSize: "11px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Custom…
          </button>
        </div>
      )}

      {hint && (
        <div
          style={{ fontSize: "11px", color: "var(--subtle)", marginTop: "6px" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
