import { actionColors, radius } from "../../../core/tokens";
import "../../../styles/hoverCard.css";

const VARIANT_STYLES = {
  primary: {
    background: "var(--primary)",
    border: "none",
    color: "#ffffff",
    fontWeight: "600",
  },
  success: {
    background: "var(--status-success)",
    border: "none",
    color: "#ffffff",
    fontWeight: "600",
  },
  edit: {
    background: actionColors.edit,
    border: "none",
    color: "#ffffff",
    fontWeight: "600",
  },
  danger: {
    background: actionColors.danger,
    border: "none",
    color: "#ffffff",
    fontWeight: "600",
  },
  secondary: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontWeight: "500",
  },
  // A "secondary" button (surface background, bordered) whose label reads as
  // dangerous without the button itself shouting - same red text the kebab
  // CardMenu uses for its danger items, so a header-row action and its
  // CardMenu equivalent (e.g. Backup's "Restore Database" button vs. a
  // backup row's Restore menu item) look consistent instead of one being a
  // solid red button and the other a plain red-text row.
  secondaryDanger: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: actionColors.dangerText,
    fontWeight: "600",
  },
};

export default function ActionButton({
  children,
  onClick,
  icon,
  variant = "primary",
  compactMode = false,
  disabled = false,
  title,
  // Only meaningful for variant="chip" - a toggle-style filter/tag button
  // (category filters, log-level filters, taskbar pills, ...). Previously
  // every one of these was hand-rolled per screen with its own radius/
  // padding/active-state colors; this variant is the one shared version.
  active = false,
  className = "",
}) {
  const isChip = variant === "chip";

  const variantStyle = isChip
    ? {
        background: active ? "var(--primary)" : "var(--surface)",
        border: active ? "1px solid transparent" : "1px solid var(--border)",
        color: active ? "#ffffff" : "var(--text)",
        fontWeight: "600",
      }
    : VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        borderRadius: isChip ? radius.pill : radius.md,
        padding: isChip
          ? compactMode
            ? "5px 10px"
            : "6px 12px"
          : compactMode
            ? "7px 9px"
            : "8px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: compactMode ? "12px" : "13px",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: isChip ? "nowrap" : undefined,
        ...variantStyle,
      }}
    >
      {icon}

      {children}
    </button>
  );
}
