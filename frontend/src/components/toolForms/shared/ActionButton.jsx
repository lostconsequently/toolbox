import { actionColors, radius } from "../../../core/tokens";

const VARIANT_STYLES = {
  primary: {
    background: "var(--primary)",
    border: "none",
    color: "#ffffff",
    fontWeight: "600",
  },
  success: {
    background: "#10b981",
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
};

export default function ActionButton({
  children,
  onClick,
  icon,
  variant = "primary",
  compactMode = false,
  disabled = false,
  title,
}) {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        borderRadius: radius.md,
        padding: compactMode ? "7px 9px" : "8px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: compactMode ? "12px" : "13px",
        opacity: disabled ? 0.5 : 1,
        ...variantStyle,
      }}
    >
      {icon}

      {children}
    </button>
  );
}
