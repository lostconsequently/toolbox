import {
  CheckCircle2,
  PackagePlus,
  PauseCircle,
  Star,
  XCircle,
} from "lucide-react";

export function getToolStatus(tool) {
  if (!tool) return "notInstalled";
  if (tool.isDraft) return "installed";
  if (!tool.enabled) return "disabled";
  if (tool.featured) return "featured";

  return "active";
}

export function getToolStatusColor(status) {
  switch (status) {
    case "active":
      return "var(--status-success)";
    case "installed":
      return "var(--status-warning)";
    case "featured":
      return "var(--primary)";
    case "disabled":
    case "notInstalled":
    default:
      return "var(--subtle)";
  }
}

export function getToolStatusIcon(status) {
  switch (status) {
    case "active":
      return CheckCircle2;
    case "installed":
      return PackagePlus;
    case "featured":
      return Star;
    case "disabled":
      return PauseCircle;
    case "notInstalled":
    default:
      return XCircle;
  }
}
