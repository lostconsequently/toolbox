export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const COMPACT_RATIO = 0.6;

export function spacingValue(key, compactMode) {
  const base = spacing[key];

  return `${compactMode ? Math.round(base * COMPACT_RATIO) : base}px`;
}

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  pill: "999px",
};

export const FALLBACK_COLOR = "#475569";

export const TASKBAR_HEIGHT = 42;

export const actionColors = {
  edit: "#7c3aed",
  danger: "#dc2626",
  dangerText: "#f87171",
};
