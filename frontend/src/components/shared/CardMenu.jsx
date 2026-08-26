import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { actionColors } from "../../core/tokens";

export default function CardMenu({ items, ariaLabel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter(Boolean);

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className="a11y-focus-ring"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          border: "1px solid transparent",
          background: open ? "var(--overlay)" : "transparent",
          color: "var(--subtle)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <MoreVertical size={16} />
      </button>

      {open && !disabled && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            top: "34px",
            minWidth: "180px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            padding: "6px",
            zIndex: 20,
          }}
        >
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="a11y-focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                boxSizing: "border-box",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                padding: "8px 10px",
                color: item.danger ? actionColors.dangerText : "var(--text)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "var(--overlay)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
