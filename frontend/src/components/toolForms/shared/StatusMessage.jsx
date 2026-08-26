function getStatusColor(status) {
  if (status === "success") {
    return "var(--status-success)";
  }

  if (status === "warning") {
    return "var(--status-warning)";
  }

  if (status === "error") {
    return "var(--status-error)";
  }

  return "var(--subtle)";
}

export default function StatusMessage({
  children,
  status = "neutral",
  compactMode = false,
}) {
  return (
    <div
      style={{
        marginTop: "10px",
        color: getStatusColor(status),
        fontSize: compactMode ? "12px" : "13px",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
