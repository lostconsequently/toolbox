import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wifi,
  Tag,
  Download,
  Printer,
  RotateCcw,
  FileText,
} from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import CheckboxOption from "./shared/CheckboxOption";
import ActionButton from "./shared/ActionButton";
import ActionRow from "./shared/ActionRow";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import CopyButton from "./shared/CopyButton";
import ToolFormLayout from "./shared/ToolFormLayout";

import {
  WIFI_SECURITY_OPTIONS,
  isOpenSecurityType,
  buildWifiQrString,
  validateWifiInput,
  buildAssetQrPayload,
  validateAssetInput,
  generateQrCode,
  renderQrToCanvas,
  downloadCanvasAsPng,
  slugifyFilename,
} from "../../core/toolEngines/qrCodeEngine";

import "../../styles/qrPrint.css";

const EMPTY_WIFI = {
  ssid: "",
  securityType: "WPA/WPA2",
  password: "",
  hidden: false,
};

const EMPTY_ASSET = {
  assetName: "",
  assetNumber: "",
  user: "",
  location: "",
  serialNumber: "",
  notes: "",
  docUrl: "",
};

const WIFI_SAMPLE = {
  ssid: "ExampleOfficeWiFi",
  securityType: "WPA/WPA2",
  password: "example-wifi-password",
  hidden: false,
};

const ASSET_SAMPLE = {
  assetName: "Example Laptop Model X",
  assetNumber: "AST-00123",
  user: "J. Example",
  location: "Example Office, 2nd floor",
  serialNumber: "SN-EXAMPLE-001",
  notes: "Delivered 2024-01-15, warranty until 2027",
  docUrl: "",
};

export default function WifiAssetQrGeneratorForm({ compactMode = false }) {
  const [mode, setMode] = useState("wifi");
  const [wifi, setWifi] = useState(EMPTY_WIFI);
  const [asset, setAsset] = useState(EMPTY_ASSET);
  const [labelCount, setLabelCount] = useState("1");
  const [qrDataUrl, setQrDataUrl] = useState("");

  const canvasRef = useRef(null);

  const updateWifi = (key, value) =>
    setWifi((prev) => ({ ...prev, [key]: value }));
  const updateAsset = (key, value) =>
    setAsset((prev) => ({ ...prev, [key]: value }));

  const validation = useMemo(
    () =>
      mode === "wifi" ? validateWifiInput(wifi) : validateAssetInput(asset),
    [mode, wifi, asset],
  );

  const qrPayload = useMemo(() => {
    if (mode === "wifi") {
      return { qrData: buildWifiQrString(wifi), isUrl: false };
    }

    return buildAssetQrPayload(asset);
  }, [mode, wifi, asset]);

  useEffect(() => {
    if (!validation.valid || !canvasRef.current) {
      setQrDataUrl("");
      return;
    }

    const result = generateQrCode(qrPayload.qrData);

    if (!result.success) {
      setQrDataUrl("");
      return;
    }

    renderQrToCanvas(canvasRef.current, result.qr, { cellSize: 10 });
    setQrDataUrl(canvasRef.current.toDataURL("image/png"));
  }, [validation.valid, qrPayload.qrData]);

  const loadSample = () => {
    if (mode === "wifi") {
      setWifi(WIFI_SAMPLE);
    } else {
      setAsset(ASSET_SAMPLE);
    }
  };

  const reset = () => {
    if (mode === "wifi") {
      setWifi(EMPTY_WIFI);
    } else {
      setAsset(EMPTY_ASSET);
    }
  };

  const downloadPng = () => {
    if (!canvasRef.current) return;

    const filename =
      mode === "wifi"
        ? slugifyFilename(wifi.ssid, "wifi-qr")
        : slugifyFilename(asset.assetName || asset.assetNumber, "asset-qr");

    downloadCanvasAsPng(canvasRef.current, filename);
  };

  const labelPrintCount = Math.min(Math.max(Number(labelCount) || 1, 1), 24);

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Wi-Fi & Asset QR Code Generator"
        description="Generate a QR code for a Wi-Fi network or an asset label. Everything is generated locally in the browser — no external services."
        compactMode={compactMode}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ActionButton
            onClick={() => setMode("wifi")}
            icon={<Wifi size={14} />}
            variant={mode === "wifi" ? "primary" : "secondary"}
            compactMode={compactMode}
          >
            Wi-Fi QR Generator
          </ActionButton>

          <ActionButton
            onClick={() => setMode("asset")}
            icon={<Tag size={14} />}
            variant={mode === "asset" ? "primary" : "secondary"}
            compactMode={compactMode}
          >
            Asset QR Generator
          </ActionButton>
        </div>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={loadSample}
            icon={<FileText size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Load sample data
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Clear
          </ActionButton>
        </ActionRow>
      </FormSection>

      {mode === "wifi" ? (
        <FormSection title="Wi-Fi network details" compactMode={compactMode}>
          <div style={{ display: "grid", gap: "12px" }}>
            <FormField
              label="SSID (network name)"
              value={wifi.ssid}
              onChange={(value) => updateWifi("ssid", value)}
              compactMode={compactMode}
            />

            <SelectField
              label="Security type"
              value={wifi.securityType}
              onChange={(value) => updateWifi("securityType", value)}
              options={WIFI_SECURITY_OPTIONS}
              compactMode={compactMode}
            />

            {!isOpenSecurityType(wifi.securityType) && (
              <FormField
                label="Password"
                value={wifi.password}
                onChange={(value) => updateWifi("password", value)}
                compactMode={compactMode}
                mono
              />
            )}

            <CheckboxOption
              label="Hidden network"
              checked={wifi.hidden}
              onChange={(value) => updateWifi("hidden", value)}
              compactMode={compactMode}
            />
          </div>
        </FormSection>
      ) : (
        <FormSection title="Asset details" compactMode={compactMode}>
          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <FormField
                label="Asset name"
                value={asset.assetName}
                onChange={(value) => updateAsset("assetName", value)}
                compactMode={compactMode}
              />

              <FormField
                label="Asset number"
                value={asset.assetNumber}
                onChange={(value) => updateAsset("assetNumber", value)}
                compactMode={compactMode}
                mono
              />

              <FormField
                label="User"
                value={asset.user}
                onChange={(value) => updateAsset("user", value)}
                compactMode={compactMode}
              />

              <FormField
                label="Location"
                value={asset.location}
                onChange={(value) => updateAsset("location", value)}
                compactMode={compactMode}
              />

              <FormField
                label="Serial number"
                value={asset.serialNumber}
                onChange={(value) => updateAsset("serialNumber", value)}
                compactMode={compactMode}
                mono
              />

              <FormField
                label="URL to documentation/asset system (optional)"
                value={asset.docUrl}
                onChange={(value) => updateAsset("docUrl", value)}
                placeholder="https://..."
                compactMode={compactMode}
              />
            </div>

            <FormField
              label="Notes"
              value={asset.notes}
              onChange={(value) => updateAsset("notes", value)}
              compactMode={compactMode}
              textarea
              rows={3}
            />
          </div>
        </FormSection>
      )}

      <FormSection title="Status" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Type QR-code"
            value={mode === "wifi" ? "Wi-Fi network" : "Asset label"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Valid configuration"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={validation.valid ? "Yes" : "No"}
                status={validation.valid ? "success" : "error"}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={validation.valid ? "Ready to scan" : validation.reason}
          />
        </ResultGrid>
      </FormSection>

      <FormSection title="QR-preview" compactMode={compactMode}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: compactMode ? "12px" : "20px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: compactMode ? "200px" : "260px",
              height: compactMode ? "200px" : "260px",
              imageRendering: "pixelated",
              display: validation.valid ? "block" : "none",
            }}
          />

          {!validation.valid && (
            <div
              style={{
                color: "#94a3b8",
                fontSize: compactMode ? "12px" : "13px",
                textAlign: "center",
                padding: "40px 20px",
              }}
            >
              Fill in the required fields to generate a QR code.
            </div>
          )}
        </div>

        {!validation.valid && (
          <StatusMessage status="error" compactMode={compactMode}>
            {validation.reason}
          </StatusMessage>
        )}

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={downloadPng}
            icon={<Download size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={!validation.valid}
          >
            Download PNG
          </ActionButton>

          <CopyButton
            value={qrPayload.qrData}
            label="Copy QR data"
            copiedLabel="Copied"
            compactMode={compactMode}
            variant="secondary"
            disabled={!validation.valid}
          />

          <ActionButton
            onClick={() => window.print()}
            icon={<Printer size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={!validation.valid}
          >
            Print
          </ActionButton>
        </ActionRow>
      </FormSection>

      <FormSection title="Summary" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          {mode === "wifi" ? (
            <>
              <InfoTile
                compactMode={compactMode}
                label="SSID"
                value={wifi.ssid || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Security"
                value={wifi.securityType}
              />
              <InfoTile
                compactMode={compactMode}
                label="Password"
                value={
                  isOpenSecurityType(wifi.securityType)
                    ? "None (open network)"
                    : wifi.password || "-"
                }
              />
              <InfoTile
                compactMode={compactMode}
                label="Hidden network"
                value={wifi.hidden ? "Yes" : "No"}
              />
            </>
          ) : (
            <>
              <InfoTile
                compactMode={compactMode}
                label="Asset name"
                value={asset.assetName || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Asset number"
                value={asset.assetNumber || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="User"
                value={asset.user || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Location"
                value={asset.location || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Serial number"
                value={asset.serialNumber || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="QR contains"
                value={
                  qrPayload.isUrl ? "Link to documentation" : "Text summary"
                }
              />
            </>
          )}
        </ResultGrid>
      </FormSection>

      <FormSection
        title="Print"
        description="Print one or more identical labels on a single page (for example for several identical devices or spare copies)."
        compactMode={compactMode}
      >
        <FormField
          label="Label count"
          type="number"
          value={labelCount}
          onChange={setLabelCount}
          compactMode={compactMode}
        />
      </FormSection>

      <div
        id="qr-print-area"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <div className="qr-print-grid">
          {Array.from({ length: labelPrintCount }).map((_, index) => (
            <div className="qr-print-label" key={index}>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR code"
                  style={{ width: "160px", height: "160px" }}
                />
              )}

              <div
                style={{ fontSize: "12px", marginTop: "6px", color: "#000000" }}
              >
                {mode === "wifi" ? (
                  <>
                    <div style={{ fontWeight: "700" }}>{wifi.ssid}</div>
                    <div>{wifi.securityType}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: "700" }}>
                      {asset.assetName || asset.assetNumber}
                    </div>
                    {asset.assetNumber && <div>{asset.assetNumber}</div>}
                    {asset.location && <div>{asset.location}</div>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolFormLayout>
  );
}
