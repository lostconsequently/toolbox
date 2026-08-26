import { useEffect, useState } from "react";
import { KeyRound, PlugZap } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import FormField from "../../components/toolForms/shared/FormField";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import Badge from "../../components/shared/Badge";
import LocalUsersSection from "./LocalUsersSection";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../services/api";

function splitList(text) {
  return text
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function modeLabelKey(mode) {
  const camel = mode.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  return `adminCenter.authentication.mode${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

export default function AuthenticationTab({ confirm, setNotice }) {
  const { isAdmin } = useAdmin();
  const { refreshStatus: refreshAuthStatus } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const [authConfig, setAuthConfig] = useState(null);
  const [authMode, setAuthMode] = useState("disabled");
  const [authTimeout, setAuthTimeout] = useState(480);
  const [authSaving, setAuthSaving] = useState(false);
  const [generatingRecoveryKey, setGeneratingRecoveryKey] = useState(false);
  const [revealedRecoveryKey, setRevealedRecoveryKey] = useState(null);

  const [entraTenantId, setEntraTenantId] = useState("");
  const [entraClientId, setEntraClientId] = useState("");
  const [entraClientSecret, setEntraClientSecret] = useState("");
  const [entraAllowedUsers, setEntraAllowedUsers] = useState("");
  const [entraAllowedGroups, setEntraAllowedGroups] = useState("");
  const [testingEntra, setTestingEntra] = useState(false);
  const [entraTestResult, setEntraTestResult] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    api
      .getAuthConfig()
      .then((config) => {
        if (ignore) return;

        setAuthConfig(config);
        setAuthMode(config.mode);
        setAuthTimeout(config.sessionTimeoutMinutes);
        setEntraTenantId(config.entraTenantId || "");
        setEntraClientId(config.entraClientId || "");
        setEntraAllowedUsers((config.entraAllowedUsers || []).join("\n"));
        setEntraAllowedGroups((config.entraAllowedGroups || []).join("\n"));
      })
      .catch(console.error);

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const saveAuthConfig = async () => {
    setAuthSaving(true);
    setNotice(null);
    setEntraTestResult(null);

    try {
      const updated = await api.updateAuthConfig({
        mode: authMode,
        sessionTimeoutMinutes: Number(authTimeout),
        entraTenantId: entraTenantId.trim(),
        entraClientId: entraClientId.trim(),
        entraClientSecret: entraClientSecret.trim(),
        entraAllowedUsers: splitList(entraAllowedUsers),
        entraAllowedGroups: splitList(entraAllowedGroups),
      });

      setAuthConfig((prev) => ({ ...prev, ...updated }));
      setAuthMode(updated.mode);
      setAuthTimeout(updated.sessionTimeoutMinutes);
      setEntraClientSecret("");
      setNotice({
        status: "success",
        message: t("adminCenter.authentication.saveSuccess"),
      });

      const refreshed = await api.getAuthConfig();
      setAuthConfig(refreshed);

      refreshAuthStatus();
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.authentication.saveFailed"),
      });
    } finally {
      setAuthSaving(false);
    }
  };

  const testEntraConfig = async () => {
    setTestingEntra(true);
    setEntraTestResult(null);

    try {
      const result = await api.testEntraConfig({
        entraTenantId: entraTenantId.trim(),
        entraClientId: entraClientId.trim(),
        entraClientSecret: entraClientSecret.trim(),
      });

      setEntraTestResult(result);
    } catch (err) {
      setEntraTestResult({ success: false, error: err.message });
    } finally {
      setTestingEntra(false);
    }
  };

  const generateRecoveryKey = async () => {
    const confirmed = await confirm(
      t("adminCenter.authentication.recoveryKeyConfirm"),
      { danger: Boolean(authConfig?.hasRecoveryKey) },
    );

    if (!confirmed) return;

    setGeneratingRecoveryKey(true);
    setNotice(null);

    try {
      const { recoveryKey } = await api.generateRecoveryKey();

      setRevealedRecoveryKey(recoveryKey);
      setAuthConfig((prev) =>
        prev ? { ...prev, hasRecoveryKey: true } : prev,
      );
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message:
          err.message || t("adminCenter.authentication.recoveryKeyFailed"),
      });
    } finally {
      setGeneratingRecoveryKey(false);
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
      <h2 style={{ marginTop: 0 }}>
        {t("adminCenter.authentication.heading")}
      </h2>

      <p style={{ color: "var(--subtle)" }}>
        {t("adminCenter.authentication.description")}
      </p>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginTop: "16px",
          marginBottom: "20px",
        }}
      >
        <label
          style={{
            color: "var(--subtle)",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {t("adminCenter.authentication.modeLabel")}
        </label>

        {[
          {
            value: "disabled",
            label: t("adminCenter.authentication.modeDisabled"),
            hint: t("adminCenter.authentication.modeDisabledHint"),
            available: true,
          },
          {
            value: "local",
            label: t("adminCenter.authentication.modeLocal"),
            hint: t("adminCenter.authentication.modeLocalHint"),
            available: true,
            beta: true,
          },
          {
            value: "local_users",
            label: t("adminCenter.authentication.modeLocalUsers"),
            hint: t("adminCenter.authentication.modeLocalUsersHint"),
            available: true,
            beta: true,
          },
          {
            value: "entra",
            label: t("adminCenter.authentication.modeEntra"),
            hint: t("adminCenter.authentication.modeEntraHint"),
            available: true,
            beta: true,
          },
          {
            value: "hybrid",
            label: t("adminCenter.authentication.modeHybrid"),
            hint: t("adminCenter.authentication.modeHybridHint"),
            available: true,
            beta: true,
          },
        ].map((option) => (
          <label
            key={option.value}
            htmlFor={`auth-mode-${option.value}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px",
              borderRadius: "10px",
              border: `1px solid ${authMode === option.value ? "var(--primary)" : "var(--border)"}`,
              background: "var(--surface)",
              cursor: option.available && isAdmin ? "pointer" : "not-allowed",
              opacity: option.available ? 1 : 0.55,
            }}
          >
            <input
              id={`auth-mode-${option.value}`}
              type="radio"
              name="auth-mode"
              value={option.value}
              checked={authMode === option.value}
              disabled={!option.available || !isAdmin}
              onChange={() => setAuthMode(option.value)}
              style={{ marginTop: "3px" }}
            />

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                }}
              >
                {option.label}

                {option.beta && (
                  <Badge
                    label={t("common.beta")}
                    color="var(--status-warning)"
                    variant="soft"
                    compactMode
                  />
                )}
              </div>

              <div style={{ fontSize: "12px", color: "var(--subtle)" }}>
                {option.hint}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ maxWidth: "260px", marginBottom: "20px" }}>
        <FormField
          label={t("adminCenter.authentication.sessionTimeoutLabel")}
          type="number"
          min={5}
          max={10080}
          value={authTimeout}
          onChange={setAuthTimeout}
          disabled={!isAdmin}
          compactMode={compactMode}
        />

        <div
          style={{ fontSize: "12px", color: "var(--subtle)", marginTop: "6px" }}
        >
          {t("adminCenter.authentication.sessionTimeoutHint")}
        </div>
      </div>

      {(authMode === "entra" || authMode === "hybrid") && (
        <div
          style={{
            padding: compactMode ? "12px" : "16px",
            marginBottom: "20px",
            background: "var(--surface)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {t("adminCenter.authentication.entraHeading")}
          </h3>

          {authConfig && !authConfig.encryptionKeyConfigured && (
            <div style={{ marginBottom: "14px" }}>
              <StatusMessage status="warning" compactMode={compactMode}>
                {t("adminCenter.authentication.entraEncryptionKeyMissing")}
              </StatusMessage>
            </div>
          )}

          <div style={{ display: "grid", gap: "14px" }}>
            <FormField
              label={t("adminCenter.authentication.entraTenantIdLabel")}
              value={entraTenantId}
              onChange={setEntraTenantId}
              placeholder="00000000-0000-0000-0000-000000000000"
              disabled={!isAdmin}
              mono
              compactMode={compactMode}
            />

            <FormField
              label={t("adminCenter.authentication.entraClientIdLabel")}
              value={entraClientId}
              onChange={setEntraClientId}
              placeholder="00000000-0000-0000-0000-000000000000"
              disabled={!isAdmin}
              mono
              compactMode={compactMode}
            />

            <div>
              <FormField
                label={t("adminCenter.authentication.entraClientSecretLabel")}
                type="password"
                value={entraClientSecret}
                onChange={setEntraClientSecret}
                placeholder={
                  authConfig?.entraClientSecretConfigured
                    ? t(
                        "adminCenter.authentication.entraClientSecretKeepPlaceholder",
                      )
                    : t(
                        "adminCenter.authentication.entraClientSecretPlaceholder",
                      )
                }
                disabled={!isAdmin}
                autoComplete="new-password"
                compactMode={compactMode}
              />

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  marginTop: "6px",
                }}
              >
                {authConfig?.entraClientSecretConfigured
                  ? t("adminCenter.authentication.entraClientSecretConfigured")
                  : t("adminCenter.authentication.entraClientSecretMissing")}
              </div>
            </div>

            <div>
              <FormField
                label={t("adminCenter.authentication.entraAllowedUsersLabel")}
                value={entraAllowedUsers}
                onChange={setEntraAllowedUsers}
                placeholder="user@company.com"
                disabled={!isAdmin}
                textarea
                rows={3}
                mono
                compactMode={compactMode}
              />

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  marginTop: "6px",
                }}
              >
                {t("adminCenter.authentication.entraAllowedUsersHint")}
              </div>
            </div>

            <div>
              <FormField
                label={t("adminCenter.authentication.entraAllowedGroupsLabel")}
                value={entraAllowedGroups}
                onChange={setEntraAllowedGroups}
                placeholder="00000000-0000-0000-0000-000000000000"
                disabled={!isAdmin}
                textarea
                rows={3}
                mono
                compactMode={compactMode}
              />

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  marginTop: "6px",
                }}
              >
                {t("adminCenter.authentication.entraAllowedGroupsHint")}
              </div>
            </div>

            <div>
              <ActionButton
                disabled={!isAdmin || testingEntra}
                variant="secondary"
                icon={<PlugZap size={14} />}
                onClick={testEntraConfig}
                compactMode={compactMode}
              >
                {testingEntra
                  ? t("adminCenter.authentication.entraTesting")
                  : t("adminCenter.authentication.entraTest")}
              </ActionButton>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  marginTop: "6px",
                }}
              >
                {t("adminCenter.authentication.entraTestHint")}
              </div>

              {entraTestResult && (
                <div style={{ marginTop: "10px" }}>
                  <StatusMessage
                    status={entraTestResult.success ? "success" : "error"}
                    compactMode={compactMode}
                  >
                    {entraTestResult.success
                      ? t("adminCenter.authentication.entraTestSuccess")
                      : entraTestResult.error ||
                        t("adminCenter.authentication.entraTestFailed")}
                  </StatusMessage>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {authMode === "local_users" && (
        <LocalUsersSection
          isAdmin={isAdmin}
          confirm={confirm}
          setNotice={setNotice}
          compactMode={compactMode}
        />
      )}

      <div
        style={{
          padding: compactMode ? "12px" : "16px",
          marginBottom: "20px",
          background: "var(--surface)",
          borderRadius: "10px",
          border: "1px solid var(--border)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
          {t("adminCenter.authentication.statusHeading")}
        </h3>

        <div style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--subtle)" }}>
              {t("adminCenter.authentication.currentMode")}
            </span>
            <strong>
              {authConfig ? t(modeLabelKey(authConfig.mode)) : "—"}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--subtle)" }}>
              {t("adminCenter.authentication.localAccountLabel")}
            </span>
            <strong>
              {authConfig?.hasLocalAccount
                ? t("adminCenter.authentication.localAccountConfigured")
                : t("adminCenter.authentication.localAccountMissing")}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--subtle)" }}>
              {t("adminCenter.authentication.activeSessions")}
            </span>
            <strong>{authConfig?.activeSessions ?? 0}</strong>
          </div>

          {authMode === "local_users" && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--subtle)" }}>
                {t("adminCenter.authentication.localUsersCount")}
              </span>
              <strong>{authConfig?.localUsersCount ?? 0}</strong>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--subtle)" }}>
              {t("adminCenter.authentication.recoveryKeyLabel")}
            </span>
            <strong>
              {authConfig?.hasRecoveryKey
                ? t("adminCenter.authentication.recoveryKeyConfigured")
                : t("adminCenter.authentication.recoveryKeyMissing")}
            </strong>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {t("adminCenter.authentication.recoveryKeyHeading")}

          <Badge
            label={t("common.beta")}
            color="var(--status-warning)"
            variant="soft"
            compactMode
          />
        </h3>

        <p style={{ color: "var(--subtle)", fontSize: "13px" }}>
          {t("adminCenter.authentication.recoveryKeyDescription")}
        </p>

        <ActionButton
          disabled={!isAdmin || generatingRecoveryKey}
          variant="secondary"
          icon={<KeyRound size={14} />}
          onClick={generateRecoveryKey}
          compactMode={compactMode}
        >
          {generatingRecoveryKey
            ? t("adminCenter.authentication.recoveryKeyGenerating")
            : t("adminCenter.authentication.recoveryKeyGenerate")}
        </ActionButton>

        {revealedRecoveryKey && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #f59e0b",
              background: "rgba(245, 158, 11, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "var(--subtle)",
                marginBottom: "8px",
              }}
            >
              {t("adminCenter.authentication.recoveryKeyRevealWarning")}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <code
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "15px",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                }}
              >
                {revealedRecoveryKey}
              </code>

              <ActionButton
                variant="secondary"
                compactMode
                onClick={() =>
                  navigator.clipboard?.writeText(revealedRecoveryKey)
                }
              >
                {t("common.copy")}
              </ActionButton>

              <ActionButton
                variant="secondary"
                compactMode
                onClick={() => setRevealedRecoveryKey(null)}
              >
                {t("adminCenter.authentication.recoveryKeyDismiss")}
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <ActionButton
          disabled={!isAdmin || authSaving}
          variant="primary"
          onClick={saveAuthConfig}
          compactMode={compactMode}
        >
          {authSaving
            ? t("adminCenter.authentication.saving")
            : t("adminCenter.authentication.save")}
        </ActionButton>
      </div>
    </div>
  );
}
