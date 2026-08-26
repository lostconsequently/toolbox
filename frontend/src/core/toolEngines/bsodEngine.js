import { api } from "../../services/api";

export async function analyzeBsodDump(file) {
  if (!file) {
    throw new Error("No dump file selected.");
  }

  if (!file.name.toLowerCase().endsWith(".dmp")) {
    throw new Error("Only .dmp files are supported.");
  }

  return api.analyzeBsodDump(file);
}

export async function lookupBsodStopCode(code) {
  const normalized = String(code || "").trim();

  if (!normalized) {
    throw new Error("Enter a stop code.");
  }

  return api.lookupBsodStopCode(normalized);
}

export async function runBsodTool() {
  return {
    type: "bsodAnalyzer",
  };
}
