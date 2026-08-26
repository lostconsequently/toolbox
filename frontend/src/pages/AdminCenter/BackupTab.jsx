import { useEffect, useRef, useState } from "react";
import {
  Clock,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import FormField from "../../components/toolForms/shared/FormField";
import StatusBadge from "../../components/toolForms/shared/StatusBadge";
import Badge from "../../components/shared/Badge";
import { useAdmin } from "../../context/AdminContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../services/api";

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

function SectionCard({ icon, title, compactMode, children }) {
  return (
    <div
      style={{
        padding: compactMode ? "12px" : "16px",
        marginBottom: "16px",
        background: "var(--surface)",
        borderRadius: "10px",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {icon}
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      {children}
    </div>
  );
}

function StatTile({ icon, value, label, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
      }}
    >
      {icon}

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: "700",
            fontSize: "13px",
            color: valueColor || "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>

        <div style={{ fontSize: "11px", color: "var(--subtle)" }}>{label}</div>
      </div>
    </div>
  );
}

export default function BackupTab({ confirm, setNotice }) {
  const { isAdmin } = useAdmin();
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const [backups, setBackups] = useState([]);
  const [restoringBackup, setRestoringBackup] = useState(null);
  const [downloadingBackup, setDownloadingBackup] = useState(null);

  const [intervalHours, setIntervalHours] = useState(24);
  const [maxBackups, setMaxBackups] = useState(10);
  const [savingConfig, setSavingConfig] = useState(false);

  const databaseInputRef = useRef(null);

  const lastExport = localStorage.getItem("toolbox_last_export");

  const lastAutomaticBackup = backups.length > 0 ? backups[0].created : null;

  const latestBackupDate = [lastExport, lastAutomaticBackup]
    .filter(Boolean)
    .map((date) => new Date(date))
    .sort((a, b) => b - a)[0];

  const refreshBackups = () => {
    return api
      .getBackups()
      .then((result) => {
        setBackups(result.backups || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    api
      .getBackups()
      .then((result) => {
        if (!ignore) {
          setBackups(result.backups || []);
        }
      })
      .catch(console.error);

    api
      .getBackupConfig()
      .then((config) => {
        if (ignore) return;

        setIntervalHours(config.intervalHours);
        setMaxBackups(config.maxBackups);
      })
      .catch(console.error);

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const saveBackupConfig = async () => {
    setSavingConfig(true);
    setNotice(null);

    try {
      const updated = await api.updateBackupConfig({
        intervalHours: Number(intervalHours),
        maxBackups: Number(maxBackups),
      });

      setIntervalHours(updated.intervalHours);
      setMaxBackups(updated.maxBackups);

      setNotice({
        status: "success",
        message: t("settings.backupSettingsSaveSuccess"),
      });
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("settings.backupSettingsSaveFailed"),
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const downloadDatabase = async () => {
    try {
      const blob = await api.downloadDatabase();

      triggerBlobDownload(
        blob,
        `toolbox-${new Date().toISOString().split("T")[0]}.db`,
      );

      localStorage.setItem("toolbox_last_export", new Date().toISOString());
    } catch (err) {
      console.error("Database download failed:", err);

      setNotice({
        status: "error",
        message: err.message || t("settings.downloadFailed"),
      });
    }
  };

  const restoreDatabase = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const confirmedStep1 = await confirm(t("settings.restoreConfirm"), {
      danger: true,
    });

    if (!confirmedStep1) {
      event.target.value = "";
      return;
    }

    const confirmedStep2 = await confirm(t("settings.restoreConfirmStep2"), {
      danger: true,
    });

    if (!confirmedStep2) {
      event.target.value = "";
      return;
    }

    try {
      const result = await api.restoreDatabase(file);

      if (result.success) {
        setNotice({ status: "success", message: t("settings.restoreSuccess") });

        window.location.reload();
      } else {
        setNotice({
          status: "error",
          message: result.error || t("settings.restoreFailed"),
        });
      }
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("settings.restoreFailed"),
      });
    }

    event.target.value = "";
  };

  const downloadBackupFile = async (backup) => {
    setDownloadingBackup(backup.name);

    try {
      const blob = await api.downloadBackupFile(backup.name);

      triggerBlobDownload(blob, backup.name);
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("settings.downloadBackupFailed"),
      });
    } finally {
      setDownloadingBackup(null);
    }
  };

  const restoreFromBackup = async (backup) => {
    setNotice(null);

    const confirmedStep1 = await confirm(
      t("settings.restoreBackupStep1Warning"),
      { danger: true },
    );

    if (!confirmedStep1) {
      return;
    }

    setRestoringBackup(backup.name);

    let prepared;

    try {
      prepared = await api.prepareRestoreFromBackup(backup.name);
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("settings.restoreBackupPrepareFailed"),
      });

      setRestoringBackup(null);

      return;
    }

    try {
      const safetyBlob = await api.downloadBackupFile(
        prepared.safetyBackupFile,
      );

      triggerBlobDownload(safetyBlob, prepared.safetyBackupFile);
    } catch (err) {
      console.error("Could not download the safety backup:", err);
    }

    const confirmedRestore = await confirm(
      t("settings.restoreBackupStep3Confirm", {
        file: prepared.safetyBackupFile,
      }),
      { danger: true },
    );

    if (!confirmedRestore) {
      try {
        await api.cancelRestoreFromBackup(prepared.restoreToken);
      } catch (err) {
        console.error("Could not cancel the restore session:", err);
      }

      setRestoringBackup(null);
      await refreshBackups();

      return;
    }

    try {
      const result = await api.commitRestoreFromBackup(prepared.restoreToken);

      const restoredAtLabel = new Date(result.restoredAt).toLocaleString(
        language === "nl" ? "nl-NL" : "en-US",
      );

      const shouldReload = await confirm(t("settings.refreshPrompt"), {
        title: t("settings.restoreBackupSuccessDetail", {
          file: result.restoredBackup,
          time: restoredAtLabel,
        }),
      });

      if (shouldReload) {
        window.location.reload();
      } else {
        await refreshBackups();
      }
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("settings.restoreBackupFailedRolledBack"),
      });

      await refreshBackups();
    } finally {
      setRestoringBackup(null);
    }
  };

  return (
    <div
      style={{
        background: "var(--card)",
        padding: compactMode ? "14px" : "20px",
        borderRadius: "12px",
        marginBottom: compactMode ? "14px" : "20px",
        border: "1px solid var(--border)",
        opacity: isAdmin ? 1 : 0.6,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{t("settings.dataManagementHeading")}</h2>

      <p style={{ color: "var(--subtle)" }}>
        {t("settings.dataManagementDescription")}
      </p>

      <SectionCard
        icon={<Download size={16} />}
        title={t("settings.manualBackupHeading")}
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          <ActionButton
            disabled={!isAdmin}
            title={
              !isAdmin
                ? t("common.adminRequired")
                : t("settings.downloadDatabaseTitle")
            }
            onClick={() => {
              if (!isAdmin) return;

              downloadDatabase();
            }}
            variant="primary"
            compactMode={compactMode}
          >
            {t("settings.downloadDatabase")}
          </ActionButton>

          <ActionButton
            disabled={!isAdmin}
            title={
              !isAdmin
                ? t("common.adminRequired")
                : t("settings.restoreDatabaseTitle")
            }
            onClick={() => {
              if (!isAdmin) return;

              databaseInputRef.current.click();
            }}
            variant="success"
            compactMode={compactMode}
          >
            {t("settings.restoreDatabase")}
          </ActionButton>
        </div>

        <input
          ref={databaseInputRef}
          type="file"
          accept=".db"
          onChange={restoreDatabase}
          style={{ display: "none" }}
        />
      </SectionCard>

      <SectionCard
        icon={<Database size={16} />}
        title={t("settings.backupCenter")}
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <StatTile
            icon={<Download size={16} color="var(--subtle)" />}
            value={
              latestBackupDate
                ? latestBackupDate.toLocaleString(
                    language === "nl" ? "nl-NL" : "en-US",
                  )
                : t("settings.never")
            }
            label={t("settings.lastBackup")}
          />

          <StatTile
            icon={
              <ShieldCheck
                size={16}
                color={
                  lastExport ? "var(--status-success)" : "var(--status-warning)"
                }
              />
            }
            value={
              latestBackupDate
                ? t("settings.backupAvailable")
                : t("settings.noBackupYet")
            }
            label={t("settings.backupStatusLabel")}
            valueColor={
              lastExport ? "var(--status-success)" : "var(--status-warning)"
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <Clock size={15} color="var(--subtle)" />

          <h4 style={{ margin: 0 }}>{t("settings.backupScheduleHeading")}</h4>

          <Badge
            label={t("common.beta")}
            color="var(--status-warning)"
            variant="soft"
            compactMode
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "10px",
          }}
        >
          <FormField
            label={t("settings.backupIntervalLabel")}
            type="number"
            min={1}
            max={168}
            value={intervalHours}
            onChange={setIntervalHours}
            disabled={!isAdmin}
            compactMode={compactMode}
          />

          <FormField
            label={t("settings.maxBackupsLabel")}
            type="number"
            min={1}
            max={100}
            value={maxBackups}
            onChange={setMaxBackups}
            disabled={!isAdmin}
            compactMode={compactMode}
          />
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--subtle)",
            marginBottom: "12px",
          }}
        >
          {t("settings.backupScheduleHint")}
        </div>

        <ActionButton
          disabled={!isAdmin || savingConfig}
          variant="primary"
          compactMode={compactMode}
          onClick={saveBackupConfig}
        >
          {savingConfig ? t("common.saving") : t("common.save")}
        </ActionButton>

        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <h4 style={{ margin: "0 0 12px 0" }}>
            {t("settings.automaticBackups")}
          </h4>

          <div
            style={{
              marginBottom: "16px",
              color: "var(--subtle)",
            }}
          >
            {t("settings.backupsStored", {
              count: backups.filter((backup) => backup.type === "automatic")
                .length,
              max: maxBackups,
            })}
          </div>

          {backups.length === 0 ? (
            <div style={{ color: "var(--subtle)" }}>
              {t("settings.noAutomaticBackups")}
            </div>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "12px",
                      }}
                    >
                      {backup.name}
                    </span>

                    <StatusBadge
                      label={
                        backup.type === "automatic"
                          ? t("settings.backupTypeAutomatic")
                          : backup.type === "restore-safety"
                            ? t("settings.backupTypeSafety")
                            : t("settings.backupTypeUnknown")
                      }
                      status={
                        backup.type === "automatic" ? "neutral" : "warning"
                      }
                      compactMode
                    />
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--subtle)",
                      marginTop: "2px",
                    }}
                  >
                    {(backup.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--subtle)",
                      textAlign: "right",
                    }}
                  >
                    {new Date(backup.created).toLocaleString(
                      language === "nl" ? "nl-NL" : "en-US",
                    )}
                  </div>

                  {isAdmin && (
                    <>
                      <ActionButton
                        icon={<Download size={13} />}
                        variant="secondary"
                        compactMode
                        disabled={
                          downloadingBackup === backup.name ||
                          Boolean(restoringBackup)
                        }
                        title={t("settings.downloadBackupTitle")}
                        onClick={() => downloadBackupFile(backup)}
                      >
                        {t("settings.downloadBackup")}
                      </ActionButton>

                      <ActionButton
                        icon={<RotateCcw size={13} />}
                        variant="danger"
                        compactMode
                        disabled={Boolean(restoringBackup)}
                        title={t("settings.restoreBackupTitle")}
                        onClick={() => restoreFromBackup(backup)}
                      >
                        {restoringBackup === backup.name
                          ? t("settings.restoreBackupInProgress")
                          : t("settings.restoreBackup")}
                      </ActionButton>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
