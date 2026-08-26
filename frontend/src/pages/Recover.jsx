import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";

import FormField from "../components/toolForms/shared/FormField";
import ActionButton from "../components/toolForms/shared/ActionButton";
import StatusMessage from "../components/toolForms/shared/StatusMessage";
import { api } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

export default function Recover() {
  const { t } = useLanguage();

  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (!recoveryKey.trim() || !newPassword) {
      setError(t("recover.fieldsRequired"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("recover.passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("recover.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.recoverPassword(recoveryKey.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || t("login.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            marginBottom: "26px",
          }}
        >
          <img
            src="/favicon.svg"
            alt="Toolbox"
            style={{ width: "56px", height: "56px", objectFit: "contain" }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "700",
              color: "var(--text)",
              letterSpacing: "-0.3px",
            }}
          >
            {t("recover.title")}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--subtle)",
              textAlign: "center",
            }}
          >
            {t("recover.subtitle")}
          </p>
        </div>

        {success ? (
          <div>
            <StatusMessage status="success">
              {t("recover.success")}
            </StatusMessage>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <Link to="/login" style={{ fontSize: "13px" }}>
                {t("recover.backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <FormField
                label={t("recover.recoveryKeyLabel")}
                value={recoveryKey}
                onChange={setRecoveryKey}
                placeholder={t("recover.recoveryKeyPlaceholder")}
                disabled={submitting}
                autoFocus
                mono
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <FormField
                label={t("recover.newPasswordLabel")}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t("recover.newPasswordPlaceholder")}
                disabled={submitting}
                autoComplete="new-password"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <FormField
                label={t("recover.confirmPasswordLabel")}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t("recover.confirmPasswordPlaceholder")}
                disabled={submitting}
                autoComplete="new-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSubmit();
                  }
                }}
              />
            </div>

            {error && (
              <div style={{ marginBottom: "12px" }}>
                <StatusMessage status="error">{error}</StatusMessage>
              </div>
            )}

            <ActionButton
              variant="primary"
              icon={<KeyRound size={15} />}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? t("recover.submitting") : t("recover.submit")}
            </ActionButton>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <Link
                to="/login"
                style={{ fontSize: "12px", color: "var(--subtle)" }}
              >
                {t("recover.backToLogin")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
