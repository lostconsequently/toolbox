import ActionButton from "../toolForms/shared/ActionButton";

export default function EmptyState({
  message,
  icon,
  actionLabel,
  onAction,
  compactMode = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        padding: icon || actionLabel ? "24px 16px" : 0,
        textAlign: "center",
      }}
    >
      {icon}

      <p style={{ color: "var(--subtle)", margin: 0 }}>{message}</p>

      {actionLabel && onAction && (
        <ActionButton
          variant="primary"
          compactMode={compactMode}
          onClick={onAction}
        >
          {actionLabel}
        </ActionButton>
      )}
    </div>
  );
}
