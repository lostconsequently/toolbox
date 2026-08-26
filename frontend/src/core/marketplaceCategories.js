export const MARKETPLACE_CATEGORIES = {
  network: { label: "Networking", color: "#2563eb" },
  mail: { label: "Mail", color: "#0f766e" },
  security: { label: "Security", color: "#dc2626" },
  diagnostics: { label: "Diagnostics", color: "#f59e0b" },
  dataEncoding: { label: "Data & Encoding", color: "#7c3aed" },
  utilities: { label: "Utilities", color: "#64748b" },
  certificates: { label: "Certificates", color: "#9333ea" },
};

export function getMarketplaceCategoryLabel(key) {
  return MARKETPLACE_CATEGORIES[key]?.label || key;
}

export function getMarketplaceCategoryColor(key) {
  return MARKETPLACE_CATEGORIES[key]?.color || "#475569";
}
