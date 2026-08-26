import { useState } from "react";
import { Download } from "lucide-react";

import ActionButton from "../../../components/toolForms/shared/ActionButton";
import { useLanguage } from "../../../context/LanguageContext";
import { api } from "../../../services/api";

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function LogExportButton({ filters, compactMode, setNotice }) {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(null);

  const runExport = async (format) => {
    setExporting(format);

    try {
      const blob = await api.exportLogs(
        {
          level: filters.level,
          category: filters.category,
          eventType: filters.eventType || undefined,
          q: filters.q || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        },
        format,
      );

      triggerBlobDownload(
        blob,
        `toolbox-logs-${new Date().toISOString().split("T")[0]}.${format}`,
      );
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.logging.exportFailed"),
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <ActionButton
        variant="secondary"
        compactMode={compactMode}
        icon={<Download size={13} />}
        disabled={Boolean(exporting)}
        onClick={() => runExport("csv")}
      >
        {exporting === "csv"
          ? t("common.loading")
          : t("adminCenter.logging.exportCsv")}
      </ActionButton>

      <ActionButton
        variant="secondary"
        compactMode={compactMode}
        icon={<Download size={13} />}
        disabled={Boolean(exporting)}
        onClick={() => runExport("json")}
      >
        {exporting === "json"
          ? t("common.loading")
          : t("adminCenter.logging.exportJson")}
      </ActionButton>
    </div>
  );
}
