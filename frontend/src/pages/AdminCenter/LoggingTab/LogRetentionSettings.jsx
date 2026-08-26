import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import ActionButton from "../../../components/toolForms/shared/ActionButton";
import FormField from "../../../components/toolForms/shared/FormField";
import { useLanguage } from "../../../context/LanguageContext";
import { api } from "../../../services/api";

const PURGE_SCOPES = ["all", "system", "error", "security"];

export default function LogRetentionSettings({
  isAdmin,
  confirm,
  setNotice,
  compactMode,
  onPurged,
}) {
  const { t } = useLanguage();

  const [systemRetentionDays, setSystemRetentionDays] = useState(30);
  const [errorRetentionDays, setErrorRetentionDays] = useState(90);
  const [securityRetentionDays, setSecurityRetentionDays] = useState(180);
  const [maxTotalRows, setMaxTotalRows] = useState(100000);
  const [saving, setSaving] = useState(false);

  const [purgeScope, setPurgeScope] = useState("all");
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let ignore = false;

    api
      .getLogConfig()
      .then((config) => {
        if (ignore) return;

        setSystemRetentionDays(config.systemRetentionDays);
        setErrorRetentionDays(config.errorRetentionDays);
        setSecurityRetentionDays(config.securityRetentionDays);
        setMaxTotalRows(config.maxTotalRows);
      })
      .catch(console.error);

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const saveConfig = async () => {
    setSaving(true);
    setNotice(null);

    try {
      const updated = await api.updateLogConfig({
        systemRetentionDays: Number(systemRetentionDays),
        errorRetentionDays: Number(errorRetentionDays),
        securityRetentionDays: Number(securityRetentionDays),
        maxTotalRows: Number(maxTotalRows),
      });

      setSystemRetentionDays(updated.systemRetentionDays);
      setErrorRetentionDays(updated.errorRetentionDays);
      setSecurityRetentionDays(updated.securityRetentionDays);
      setMaxTotalRows(updated.maxTotalRows);

      setNotice({
        status: "success",
        message: t("adminCenter.logging.retentionSaved"),
      });
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.logging.retentionSaveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const runPurge = async () => {
    const confirmed = await confirm(
      t("adminCenter.logging.purgeConfirm", {
        scope: t(`adminCenter.logging.purgeScope.${purgeScope}`),
      }),
      { danger: true },
    );

    if (!confirmed) return;

    setPurging(true);
    setNotice(null);

    try {
      const { deletedCount } = await api.purgeLogs(
        purgeScope === "all" ? {} : { category: purgeScope },
      );

      setNotice({
        status: "success",
        message: t("adminCenter.logging.purgeSuccess", { count: deletedCount }),
      });

      onPurged?.();
    } catch (err) {
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.logging.purgeFailed"),
      });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "10px",
        }}
      >
        <FormField
          label={t("adminCenter.logging.retentionSystemLabel")}
          type="number"
          min={0}
          max={3650}
          value={systemRetentionDays}
          onChange={setSystemRetentionDays}
          disabled={!isAdmin}
          compactMode={compactMode}
        />

        <FormField
          label={t("adminCenter.logging.retentionErrorLabel")}
          type="number"
          min={0}
          max={3650}
          value={errorRetentionDays}
          onChange={setErrorRetentionDays}
          disabled={!isAdmin}
          compactMode={compactMode}
        />

        <FormField
          label={t("adminCenter.logging.retentionSecurityLabel")}
          type="number"
          min={0}
          max={3650}
          value={securityRetentionDays}
          onChange={setSecurityRetentionDays}
          disabled={!isAdmin}
          compactMode={compactMode}
        />

        <FormField
          label={t("adminCenter.logging.retentionMaxRowsLabel")}
          type="number"
          min={1000}
          max={1000000}
          value={maxTotalRows}
          onChange={setMaxTotalRows}
          disabled={!isAdmin}
          compactMode={compactMode}
        />
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "var(--subtle)",
          marginBottom: "14px",
        }}
      >
        {t("adminCenter.logging.retentionHint")}
      </div>

      <ActionButton
        disabled={!isAdmin || saving}
        variant="primary"
        compactMode={compactMode}
        onClick={saveConfig}
      >
        {saving ? t("common.saving") : t("common.save")}
      </ActionButton>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0" }}>
          {t("adminCenter.logging.purgeHeading")}
        </h4>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: "180px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "var(--subtle)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {t("adminCenter.logging.purgeScopeLabel")}
            </label>

            <select
              value={purgeScope}
              onChange={(event) => setPurgeScope(event.target.value)}
              disabled={!isAdmin}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0 10px",
                fontSize: compactMode ? "12px" : "13px",
                height: compactMode ? "34px" : "38px",
              }}
            >
              {PURGE_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {t(`adminCenter.logging.purgeScope.${scope}`)}
                </option>
              ))}
            </select>
          </div>

          <ActionButton
            disabled={!isAdmin || purging}
            variant="danger"
            compactMode={compactMode}
            icon={<Trash2 size={13} />}
            onClick={runPurge}
          >
            {purging
              ? t("adminCenter.logging.purging")
              : t("adminCenter.logging.purgeNow")}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
