import { api } from "../../services/api";

function isIPv4(s) {
  const parts = String(s).split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function isIPv6(s) {
  return /^[0-9a-f:]+$/i.test(String(s)) && String(s).split(":").length >= 2;
}

export function isValidIp(ip) {
  return isIPv4(ip) || isIPv6(ip);
}

export async function lookupReverseDns(ip) {
  if (!isValidIp(ip)) {
    throw new Error("Invalid IP address.");
  }

  return api.lookupReverseDns(ip);
}

export async function runReverseDnsTool(tool, inputValues) {
  return lookupReverseDns(inputValues.ip || inputValues.input || "");
}
