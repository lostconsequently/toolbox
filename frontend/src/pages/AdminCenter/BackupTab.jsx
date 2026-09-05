import { useEffect, useReducer, useRef } from "react";
import { Clock, Database, Download, RotateCcw } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import FormField from "../../components/toolForms/shared/FormField";
import StatusBadge from "../../components/toolForms/shared/StatusBadge";
import Card from "../../components/shared/Card";
import CardMenu from "../../components/shared/CardMenu";
import { useAdmin } from "../../context/AdminContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { useTimeSettings } from "../../context/TimeSettingsContext";
import { api } from "../../services/api";
import { cardPadding, stackedFieldMaxWidth } from "../../core/tokens";

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

// The form previously tracked backups/interval/maxBackups/savingConfig/last
// run info/restoring/downloading as ~10 independent useState calls for one
// interdependent form (loading the schedule and loading the backup list feed
// into the same UI). A reducer keeps each state transition explicit and
// makes it impossible for one setter to update while a sibling field is
// left stale.
const initialState = {
  backups: [],
  restoringBackup: null,
  downloadingBackup: null,
  intervalHours: 24,
  maxBackups: 10,
  savingConfig: false,
  lastRunAt: null,
  lastRunStatus: null,
  nextRunAt: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_BACKUPS":
      return { ...state, backups: action.backups };
    case "SET_SCHEDULE_CONFIG":
      return {
        ...state,
        intervalHours: action.intervalHours,
        maxBackups: action.maxBackups,
        lastRunAt: action.lastRunAt,
        lastRunStatus: action.lastRunStatus,
        nextRunAt: action.nextRunAt,
      };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

export default function BackupTab({ confirm, setNotice }) {
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { formatDateTime } = useTimeSettings();

  const compactMode = settings?.compactMode || false;

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    backups,
    restoringBackup,
    downloadingBackup,
    intervalHours,
    maxBackups,
    savingConfig,
    lastRunAt,
    lastRunStatus,
    nextRunAt,
  } = state;

  const setField = (field, value) => dispatch({ type: "SET_FIELD", field, value });

  const databaseInputRef = useRef(null);

  const refreshBackups = async () => {
    try {
      const result = await api.getBackups();

      dispatch({ type: "SET_BACKUPS", backups: result.backups || [] });
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.loadBackupsFailed"),
      });
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    (async () => {
      try {
        const result = await api.getBackups();

        if (!ignore) {
          dispatch({ type: "SET_BACKUPS", backups: result.backups || [] });
        }
      } catch (err) {
        if (ignore) return;

        console.error(err);

        setNotice({
          status: "error",
          message: err.message || t("adminCenter.backup.loadBackupsFailed"),
        });
      }

      try {
        const config = await api.getBackupConfig();

        if (!ignore) {
          dispatch({
            type: "SET_SCHEDULE_CONFIG",
            intervalHours: config.intervalHours,
            maxBackups: config.maxBackups,
            lastRunAt: config.lastRunAt,
            lastRunStatus: config.lastRunStatus,
            nextRunAt: config.nextRunAt,
          });
        }
      } catch (err) {
        if (ignore) return;

        console.error(err);

        setNotice({
          status: "error",
          message: err.message || t("adminCenter.backup.loadScheduleFailed"),
        });
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const saveBackupConfig = async () => {
    setField("savingConfig", true);
    setNotice(null);

    try {
      const updated = await api.updateBackupConfig({
        intervalHours: Number(intervalHours),
        maxBackups: Number(maxBackups),
      });

      dispatch({
        type: "SET_SCHEDULE_CONFIG",
        intervalHours: updated.intervalHours,
        maxBackups: updated.maxBackups,
        lastRunAt: updated.lastRunAt,
        lastRunStatus: updated.lastRunStatus,
        nextRunAt: updated.nextRunAt,
      });

      setNotice({
        status: "success",
        message: t("adminCenter.backup.scheduleSaveSuccess"),
      });
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.scheduleSaveFailed"),
      });
    } finally {
      setField("savingConfig", false);
    }
  };

  const downloadDatabase = async () => {
    try {
      const blob = await api.downloadDatabase();

      triggerBlobDownload(
        blob,
        `toolbox-${new Date().toISOString().split("T")[0]}.db`,
      );
    } catch (err) {
      console.error("Database download failed:", err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.downloadFailed"),
      });
    }
  };

  // Warns immediately on click, before the file picker even opens - matching
  // the kebab menu's restore flow, which warns first and only then acts.
  // Previously this button opened the file picker straight away and only
  // warned after a file was already chosen, so the two restore paths felt
  // inconsistent.
  const startRestoreDatabase = async () => {
    const confirmed = await confirm(t("adminCenter.backup.restoreConfirm"), {
      danger: true,
    });

    if (!confirmed) return;

    databaseInputRef.current.click();
  };

  const restoreDatabase = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const confirmedStep2 = await confirm(
      t("adminCenter.backup.restoreConfirmStep2"),
      { danger: true },
    );

    if (!confirmedStep2) {
      event.target.value = "";
      return;
    }

    try {
      const result = await api.restoreDatabase(file);

      if (result.success) {
        setNotice({
          status: "success",
          message: t("adminCenter.backup.restoreSuccess"),
        });

        window.location.reload();
      } else {
        setNotice({
          status: "error",
          message: result.error || t("adminCenter.backup.restoreFailed"),
        });
      }
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.restoreFailed"),
      });
    }

    event.target.value = "";
  };

  const downloadBackupFile = async (backup) => {
    setField("downloadingBackup", backup.name);

    try {
      const blob = await api.downloadBackupFile(backup.name);

      triggerBlobDownload(blob, backup.name);
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.downloadBackupFailed"),
      });
    } finally {
      setField("downloadingBackup", null);
    }
  };

  const restoreFromBackup = async (backup) => {
    setNotice(null);

    const confirmedStep1 = await confirm(
      t("adminCenter.backup.restoreBackupStep1Warning"),
      { danger: true },
    );

    if (!confirmedStep1) {
      return;
    }

    setField("restoringBackup", backup.name);

    let prepared;

    try {
      prepared = await api.prepareRestoreFromBackup(backup.name);
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.backup.restoreBackupPrepareFailed"),
      });

      setField("restoringBackup", null);

      return;
    }

    try {
      const safetyBlob = await api.downloadBackupFile(
        prepared.safetyBackupFile,
      );

      triggerBlobDownload(safetyBlob, prepared.safetyBackupFile);
    } catch (err) {
      console.error("Could not download the safety backup:", err);

      setNotice({
        status: "error",
        message: t("adminCenter.backup.safetyBackupDownloadFailed"),
      });
    }

    const confirmedRestore = await confirm(
      t("adminCenter.backup.restoreBackupStep3Confirm", {
        file: prepared.safetyBackupFile,
      }),
      { danger: true },
    );

    if (!confirmedRestore) {
      try {
        await api.cancelRestoreFromBackup(prepared.restoreToken);
      } catch (err) {
        console.error("Could not cancel the restore session:", err);

        setNotice({
          status: "error",
          message: t("adminCenter.backup.restoreCancelFailed"),
        });
      }

      setField("restoringBackup", null);
      await refreshBackups();

      return;
    }

    try {
      const result = await api.commitRestoreFromBackup(prepared.restoreToken);

      const restoredAtLabel = formatDateTime(new Date(result.restoredAt));

      const shouldReload = await confirm(t("adminCenter.backup.refreshPrompt"), {
        title: t("adminCenter.backup.restoreBackupSuccessDetail", {
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
        message:
          err.message || t("adminCenter.backup.restoreBackupFailedRolledBack"),
      });

      await refreshBackups();
    } finally {
      setField("restoringBackup", null);
    }
  };

  const cardStyle = {
    padding: compactMode ? cardPadding.compact : cardPadding.normal,
    marginBottom: compactMode ? cardPadding.compact : cardPadding.normal,
  };

  return (
    <div style={{ opacity: isAdmin ? 1 : 0.6 }}>
      <Card style={cardStyle} hoverLift={false}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Clock size={16} />
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.backup.backupScheduleHeading")}
          </h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "14px",
            maxWidth: stackedFieldMaxWidth,
            marginBottom: "14px",
          }}
        >
          <FormField
            label={t("adminCenter.backup.backupIntervalLabel")}
            hint={t("adminCenter.backup.backupIntervalHint")}
            type="number"
            min={1}
            max={168}
            value={intervalHours}
            onChange={(value) => setField("intervalHours", value)}
            disabled={!isAdmin}
            compactMode={compactMode}
            className="no-spinner"
            wrapperClassName="hover-card"
          />

          <FormField
            label={t("adminCenter.backup.maxBackupsLabel")}
            hint={t("adminCenter.backup.maxBackupsHint")}
            type="number"
            min={1}
            max={100}
            value={maxBackups}
            onChange={(value) => setField("maxBackups", value)}
            disabled={!isAdmin}
            compactMode={compactMode}
            className="no-spinner"
            wrapperClassName="hover-card"
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: "4px",
            fontSize: "12px",
            color: "var(--subtle)",
            marginBottom: "14px",
          }}
        >
          <div>
            {t("adminCenter.backup.backupLastRun")}:{" "}
            <strong style={{ color: "var(--text)" }}>
              {lastRunAt
                ? `${formatDateTime(new Date(lastRunAt))} (${t(`adminCenter.backup.backupRunStatus.${lastRunStatus}`)})`
                : t("adminCenter.backup.backupLastRunNever")}
            </strong>
          </div>

          <div>
            {t("adminCenter.backup.backupNextRun")}:{" "}
            <strong style={{ color: "var(--text)" }}>
              {nextRunAt ? formatDateTime(new Date(nextRunAt)) : "—"}
            </strong>
          </div>
        </div>

        <ActionButton
          disabled={!isAdmin || savingConfig}
          variant="primary"
          compactMode={compactMode}
          onClick={saveBackupConfig}
          className="hover-card"
        >
          {savingConfig ? t("common.saving") : t("common.save")}
        </ActionButton>
      </Card>

      <Card style={cardStyle} hoverLift={false}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Database size={16} />
            <h3 style={{ margin: 0 }}>
              {t("adminCenter.backup.automaticBackups")}
            </h3>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <ActionButton
              disabled={!isAdmin}
              title={
                !isAdmin
                  ? t("common.adminRequired")
                  : t("adminCenter.backup.downloadDatabaseTitle")
              }
              onClick={() => {
                if (!isAdmin) return;

                downloadDatabase();
              }}
              variant="secondary"
              compactMode
              className="hover-card"
            >
              {t("adminCenter.backup.downloadDatabase")}
            </ActionButton>

            <ActionButton
              disabled={!isAdmin}
              title={
                !isAdmin
                  ? t("common.adminRequired")
                  : t("adminCenter.backup.restoreDatabaseTitle")
              }
              onClick={() => {
                if (!isAdmin) return;

                startRestoreDatabase();
              }}
              variant="secondaryDanger"
              compactMode
              className="hover-card"
            >
              {t("adminCenter.backup.restoreDatabase")}
            </ActionButton>

            <input
              ref={databaseInputRef}
              type="file"
              accept=".db"
              onChange={restoreDatabase}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: "16px",
            color: "var(--subtle)",
          }}
        >
          {t("adminCenter.backup.backupsStored", {
            count: backups.filter((backup) => backup.type === "automatic")
              .length,
            max: maxBackups,
          })}
        </div>

        {backups.length === 0 ? (
          <div style={{ color: "var(--subtle)" }}>
            {t("adminCenter.backup.noAutomaticBackups")}
          </div>
        ) : (
          backups.map((backup) => {
            const busy =
              downloadingBackup === backup.name || Boolean(restoringBackup);

            return (
              <Card
                key={backup.name}
                style={{
                  padding: compactMode ? "10px 12px" : "12px 14px",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Database size={16} color="var(--subtle)" />

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
                          color: "var(--text)",
                        }}
                      >
                        {backup.name}
                      </span>

                      <StatusBadge
                        label={
                          backup.type === "automatic"
                            ? t("adminCenter.backup.backupTypeAutomatic")
                            : backup.type === "restore-safety"
                              ? t("adminCenter.backup.backupTypeSafety")
                              : t("adminCenter.backup.backupTypeUnknown")
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
                      {(backup.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {formatDateTime(new Date(backup.created))}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <CardMenu
                    ariaLabel={t("adminCenter.backup.moreActions", {
                      name: backup.name,
                    })}
                    disabled={busy}
                    items={[
                      {
                        label:
                          downloadingBackup === backup.name
                            ? t("common.saving")
                            : t("adminCenter.backup.downloadBackup"),
                        icon: <Download size={14} />,
                        onClick: () => downloadBackupFile(backup),
                      },
                      {
                        label:
                          restoringBackup === backup.name
                            ? t("adminCenter.backup.restoreBackupInProgress")
                            : t("adminCenter.backup.restoreBackup"),
                        icon: <RotateCcw size={14} />,
                        onClick: () => restoreFromBackup(backup),
                        danger: true,
                      },
                    ]}
                  />
                )}
              </Card>
            );
          })
        )}
      </Card>
    </div>
  );
}
