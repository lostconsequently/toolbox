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

// The two card-padding scales the app actually uses in practice: a
// top-level page card (AboutTab, GeneralTab, ...) and a nested section
// inside one (SectionCard). Previously each caller re-literaled its own
// px values by hand, which let them drift (e.g. a top-level card at
// "14px"/"20px" here, a copy of it elsewhere at "16px"/"20px") - naming
// them once means every consumer of "the outer card" or "a section inside
// it" shares the exact same padding, and any future rescale only happens
// in one place.
export const cardPadding = { normal: "20px", compact: "14px" };
export const sectionPadding = { normal: "16px", compact: "12px" };

export const FALLBACK_COLOR = "#475569";

export const TASKBAR_HEIGHT = 42;

// The one "is this a phone" breakpoint, shared by every component that needs
// to switch to a stacked/fullscreen mobile layout (Sidebar's drawer mode,
// FloatingWindow's forced-fullscreen mode) - previously each picked its own
// value (640px vs 768px), so the app's notion of "mobile" changed depending
// on which component you were looking at.
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 640px)";

// Shared basics for the app's centered-dialog-style modals (ConfirmDialog,
// CommandPalette, ScriptForm). Previously each picked its own scrim opacity
// (0.5 vs 0.6) and z-index (10000 vs 10001) independently, which is exactly
// the kind of drift that causes a real stacking bug the day a new modal
// picks a z-index that lands in between.
export const modal = {
  scrim: "rgba(0, 0, 0, 0.6)",
  panelRadius: "14px",
  zIndex: 10001,
};

// Shared cap for a single-column stack of form fields (Admin Center tabs
// moving from a multi-column grid to one field per row) - a bare "1fr"
// column stretches every input/select to the full card width, which looks
// odd once the card itself is wide. One named width means every tab that
// switches to this layout stays visually consistent instead of each
// guessing its own number.
export const stackedFieldMaxWidth = "360px";

export const actionColors = {
  edit: "#7c3aed",
  danger: "#dc2626",
  dangerText: "#f87171",
};
