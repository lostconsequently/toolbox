export default function InfoTile({
  label,
  value,
  color,
  icon,
  compactMode = false,
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: compactMode ? "8px" : "10px",
        background: "var(--surface)",
        padding: compactMode ? "8px" : "10px",
      }}
    >
      <div
        style={{
          color: "var(--subtle)",
          fontSize: compactMode ? "11px" : "12px",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: color || "var(--text)",
          fontSize: compactMode ? "12px" : "13px",
          fontWeight: "600",
          wordBreak: "break-word",
          display: "flex",
          alignItems: "center",
          gap: compactMode ? "4px" : "6px",
        }}
      >
        {icon}

        {value ?? "Not found"}
      </div>
    </div>
  );
}
