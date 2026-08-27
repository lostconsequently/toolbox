import { useRef, useState } from "react";
import { Database, FolderTree, LayoutGrid, RotateCcw } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function MethodCard({ icon, title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
        textAlign: "left",
        padding: "16px",
        borderRadius: "12px",
        border: selected
          ? "2px solid var(--primary)"
          : "1px solid var(--border)",
        background: selected ? "var(--overlay)" : "var(--surface)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "var(--overlay)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div style={{ fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
          {title}
        </div>
        <div style={{ fontSize: "12px", color: "var(--subtle)" }}>
          {description}
        </div>
      </div>
    </button>
  );
}

export default function MethodStep({ wizardState, patchState, onNext, onBack }) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  const selectMethod = async (method) => {
    setError("");

    if (method === "fresh") {
      // Discard any previously prepared restore upload so it doesn't linger
      // server-side or get committed by mistake later.
      if (wizardState.restoreToken) {
        api.cancelSetupRestore(wizardState.restoreToken).catch(() => {});
      }

      patchState({
        method: "fresh",
        restoreToken: null,
        restoreInfo: null,
        seedOption: wizardState.seedOption || "empty",
      });
      return;
    }

    patchState({ method: "restore" });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setValidating(true);
    setError("");

    try {
      const result = await api.prepareSetupRestore(file);

      patchState({
        method: "restore",
        restoreToken: result.token,
        restoreInfo: {
          sizeBytes: result.sizeBytes,
          modifiedAt: result.modifiedAt,
        },
      });
    } catch (err) {
      setError(err.message || t("setupWizard.errorGeneric"));
      patchState({ restoreToken: null, restoreInfo: null });
    } finally {
      setValidating(false);
    }
  };

  const canProceed =
    (wizardState.method === "fresh" && Boolean(wizardState.seedOption)) ||
    (wizardState.method === "restore" && Boolean(wizardState.restoreToken));

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--text)" }}>
        {t("setupWizard.methodTitle")}
      </h2>

      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--subtle)" }}>
        {t("setupWizard.methodDescription")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <MethodCard
          icon={<Database size={17} color="var(--primary)" />}
          title={t("setupWizard.methodFreshTitle")}
          description={t("setupWizard.methodFreshDescription")}
          selected={wizardState.method === "fresh"}
          onClick={() => selectMethod("fresh")}
        />

        <MethodCard
          icon={<RotateCcw size={17} color="var(--primary)" />}
          title={t("setupWizard.methodRestoreTitle")}
          description={t("setupWizard.methodRestoreDescription")}
          selected={wizardState.method === "restore"}
          onClick={() => selectMethod("restore")}
        />
      </div>

      {wizardState.method === "fresh" && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--overlay)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--subtle)",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {t("setupWizard.seedTitle")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <MethodCard
              icon={<Database size={16} color="var(--primary)" />}
              title={t("setupWizard.seedEmptyTitle")}
              description={t("setupWizard.seedEmptyDescription")}
              selected={wizardState.seedOption === "empty"}
              onClick={() => patchState({ seedOption: "empty" })}
            />

            <MethodCard
              icon={<FolderTree size={16} color="var(--primary)" />}
              title={t("setupWizard.seedCategoriesTitle")}
              description={t("setupWizard.seedCategoriesDescription")}
              selected={wizardState.seedOption === "categories"}
              onClick={() => patchState({ seedOption: "categories" })}
            />

            <MethodCard
              icon={<LayoutGrid size={16} color="var(--primary)" />}
              title={t("setupWizard.seedCategoriesAndToolsTitle")}
              description={t("setupWizard.seedCategoriesAndToolsDescription")}
              selected={wizardState.seedOption === "categoriesAndTools"}
              onClick={() => patchState({ seedOption: "categoriesAndTools" })}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".db"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {wizardState.method === "restore" && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--overlay)",
          }}
        >
          {validating && (
            <StatusMessage status="neutral">
              {t("setupWizard.restoreValidating")}
            </StatusMessage>
          )}

          {!validating && wizardState.restoreInfo && (
            <>
              <StatusMessage status="success">
                {t("setupWizard.restoreValid")}
              </StatusMessage>

              <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--subtle)" }}>
                <div>
                  {t("setupWizard.restoreSize")}:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {formatBytes(wizardState.restoreInfo.sizeBytes)}
                  </strong>
                </div>
                <div>
                  {t("setupWizard.restoreModified")}:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {new Date(wizardState.restoreInfo.modifiedAt).toLocaleString()}
                  </strong>
                </div>
                <div>
                  {t("setupWizard.restoreVersion")}:{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {t("setupWizard.restoreVersionUnavailable")}
                  </strong>
                </div>
              </div>

              <ActionRow marginTop="10px">
                <ActionButton
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("setupWizard.restoreChooseAnother")}
                </ActionButton>
              </ActionRow>
            </>
          )}

          {error && <StatusMessage status="error">{error}</StatusMessage>}
        </div>
      )}

      <ActionRow justify="space-between" marginTop="24px">
        <ActionButton variant="secondary" onClick={onBack}>
          {t("setupWizard.back")}
        </ActionButton>

        <ActionButton variant="primary" onClick={onNext} disabled={!canProceed}>
          {t("setupWizard.next")}
        </ActionButton>
      </ActionRow>
    </div>
  );
}
