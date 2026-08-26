import { toolRegistry } from "./toolRegistry";
import { FALLBACK_COLOR } from "./tokens";

const colorMap = {
  dns: "var(--primary)",
  dnsPropagationViewer: "var(--primary)",
  reverseDns: "var(--primary)",

  mail: "#0f766e",
  dmarcBuilder: "#0f766e",
  dmarcReportParser: "#0f766e",
  spfBuilder: "#0f766e",
  spfFlatten: "#0f766e",
  smtpConfigurationBuilder: "#0f766e",

  ipLookup: "#0ea5e9",
  mac: "#0891b2",
  portCheck: "#0ea5e9",
  subnetCalculator: "#0ea5e9",
  whoisLookup: "#0ea5e9",

  reputationCheck: "#9333ea",
  sslChecker: "#9333ea",
  certificateToolkit: "#9333ea",

  secretGenerator: "#16a34a",
  password: "#16a34a",
  sidConverter: "#16a34a",

  bsodAnalyzer: "#dc2626",
  link: "#f59e0b",
};

function hashString(value) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

const HUE_STEP = 47;
const SATURATION = "65%";
const LIGHTNESS = "50%";

export function getToolTypeLabel(toolType) {
  return toolRegistry[toolType]?.label || "Tool";
}

export function getToolTypeColor(toolType) {
  if (colorMap[toolType]) {
    return colorMap[toolType];
  }

  if (!toolType) {
    return FALLBACK_COLOR;
  }

  const hue = (hashString(toolType) * HUE_STEP) % 360;

  return `hsl(${hue}, ${SATURATION}, ${LIGHTNESS})`;
}
