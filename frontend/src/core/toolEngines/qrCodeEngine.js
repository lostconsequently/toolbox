import qrcode from "qrcode-generator";

function toBinaryString(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return binary;
}

function escapeWifiValue(value) {
  return String(value ?? "").replace(/([\\;,:"])/g, "\\$1");
}

const WIFI_SECURITY_TYPE_CODE = {
  "WPA/WPA2": "WPA",
  WPA3: "WPA",
  WEP: "WEP",
  Open: "nopass",
};

export const WIFI_SECURITY_OPTIONS = [
  { value: "WPA/WPA2", label: "WPA/WPA2" },
  { value: "WPA3", label: "WPA3" },
  { value: "WEP", label: "WEP" },
  { value: "Open", label: "Open network" },
];

export function isOpenSecurityType(securityType) {
  return WIFI_SECURITY_TYPE_CODE[securityType] === "nopass";
}

export function buildWifiQrString({ ssid, securityType, password, hidden }) {
  const typeCode = WIFI_SECURITY_TYPE_CODE[securityType] || "WPA";
  const isOpen = typeCode === "nopass";

  return [
    "WIFI:",
    `T:${typeCode};`,
    `S:${escapeWifiValue(ssid)};`,
    isOpen ? "" : `P:${escapeWifiValue(password)};`,
    hidden ? "H:true;" : "",
    ";",
  ].join("");
}

export function validateWifiInput({ ssid, securityType, password }) {
  if (!ssid || !ssid.trim()) {
    return { valid: false, reason: "SSID is required." };
  }

  if (!isOpenSecurityType(securityType) && (!password || !password.trim())) {
    return {
      valid: false,
      reason: "A password is required for a secured network.",
    };
  }

  return { valid: true };
}

export function buildAssetQrPayload({
  assetName,
  assetNumber,
  user,
  location,
  serialNumber,
  notes,
  docUrl,
}) {
  const trimmedUrl = (docUrl || "").trim();

  if (trimmedUrl) {
    return { qrData: trimmedUrl, isUrl: true };
  }

  const lines = [
    assetName && `Asset: ${assetName}`,
    assetNumber && `Asset number: ${assetNumber}`,
    user && `User: ${user}`,
    location && `Location: ${location}`,
    serialNumber && `Serial number: ${serialNumber}`,
    notes && `Notes: ${notes}`,
  ].filter(Boolean);

  return { qrData: lines.join("\n"), isUrl: false };
}

export function validateAssetInput({
  assetName,
  assetNumber,
  serialNumber,
  docUrl,
}) {
  if (
    !assetName?.trim() &&
    !assetNumber?.trim() &&
    !serialNumber?.trim() &&
    !docUrl?.trim()
  ) {
    return {
      valid: false,
      reason:
        "Enter at least an asset name, asset number, serial number or documentation URL.",
    };
  }

  return { valid: true };
}

const ERROR_CORRECTION_LEVEL = "M";

export function generateQrCode(data) {
  if (!data) {
    return { success: false, error: "No data to encode." };
  }

  try {
    const qr = qrcode(0, ERROR_CORRECTION_LEVEL);
    qr.addData(toBinaryString(data));
    qr.make();

    return { success: true, qr };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Generating the QR code failed.",
    };
  }
}

export function renderQrToCanvas(
  canvas,
  qr,
  {
    cellSize = 8,
    marginModules = 4,
    darkColor = "#000000",
    lightColor = "#ffffff",
  } = {},
) {
  if (!canvas || !qr) return;

  const moduleCount = qr.getModuleCount();
  const size = (moduleCount + marginModules * 2) * cellSize;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = darkColor;

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          (col + marginModules) * cellSize,
          (row + marginModules) * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }
}

export function slugifyFilename(value, fallback = "qrcode") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function downloadCanvasAsPng(canvas, filename) {
  if (!canvas) return;

  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.endsWith(".png") ? filename : `${filename}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }, "image/png");
}

export async function runQrCodeTool(tool, inputValues) {
  return inputValues.result || { success: false, error: "No data" };
}
