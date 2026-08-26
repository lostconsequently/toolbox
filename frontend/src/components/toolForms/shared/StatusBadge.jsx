import Badge from "../../shared/Badge";

export function getStatusColor(status) {
  if (status === "success" || status === "valid" || status === "strong") {
    return "var(--status-success)";
  }

  if (status === "warning" || status === "medium") {
    return "var(--status-warning)";
  }

  if (status === "error" || status === "invalid" || status === "weak") {
    return "var(--status-error)";
  }

  return "var(--subtle)";
}

export default function StatusBadge({
  label,
  status = "neutral",
  compactMode = false,
}) {
  return (
    <Badge
      label={label}
      color={getStatusColor(status)}
      variant="soft"
      compactMode={compactMode}
    />
  );
}
