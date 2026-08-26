import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import { actionColors } from "../core/tokens";

export default function AdminButton() {
  const {
    isAdmin,
    loginAdmin,
    logoutAdmin,
    sessionExpired,
    clearSessionExpired,
  } = useAdmin();
  const { settings } = useSettings();
  const { t } = useLanguage();

  const compactMode = settings?.compactMode || false;

  const [showLogin, setShowLogin] = useState(sessionExpired);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      setShowLogin(true);
      setError(t("admin.sessionExpired"));
    }
  }, [sessionExpired, t]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError(t("admin.passwordRequired"));
      return;
    }

    setIsLoggingIn(true);
    setError("");

    try {
      const success = await loginAdmin(password);

      if (success) {
        setPassword("");
        setError("");
        setShowLogin(false);
        clearSessionExpired();
        return;
      }

      setError(t("admin.invalidPassword"));
    } catch (err) {
      console.error("Admin login error:", err);
      setError(t("admin.loginFailed"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (isAdmin) {
      await logoutAdmin();
      setShowLogin(false);
      setPassword("");
      setError("");
      return;
    }

    setShowLogin(true);
  };

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <button
        onClick={handleToggleAdmin}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: compactMode ? "34px" : "38px",
          padding: compactMode ? "0 10px" : "0 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: isAdmin ? "rgba(16,185,129,0.15)" : "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: compactMode ? "12px" : "13px",
        }}
      >
        {isAdmin ? <Unlock size={16} /> : <Lock size={16} />}

        {isAdmin ? t("admin.adminActive") : t("admin.admin")}
      </button>

      {showLogin && !isAdmin && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "46px",
            width: "280px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "14px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            zIndex: 100,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: "10px",
            }}
          >
            {t("admin.loginHeading")}
          </h3>

          <label
            style={{
              display: "block",
              color: "var(--subtle)",
              fontSize: "13px",
              marginBottom: "6px",
            }}
          >
            {t("admin.password")}
          </label>

          <input
            type="password"
            name="admin-access-code"
            value={password}
            disabled={isLoggingIn}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }

              if (e.key === "Escape") {
                setShowLogin(false);
                setPassword("");
                setError("");
                clearSessionExpired();
              }
            }}
            style={{
              width: "100%",
              height: "38px",
              boxSizing: "border-box",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0 10px",
              outline: "none",
              marginBottom: "10px",
              opacity: isLoggingIn ? 0.7 : 1,
            }}
          />

          {error && (
            <div
              style={{
                color: actionColors.dangerText,
                fontSize: "12px",
                marginBottom: "10px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <ActionButton
              disabled={isLoggingIn}
              onClick={() => {
                setShowLogin(false);
                setPassword("");
                setError("");
                clearSessionExpired();
              }}
              variant="secondary"
            >
              {t("common.cancel")}
            </ActionButton>

            <ActionButton
              disabled={isLoggingIn}
              onClick={handleLogin}
              variant="primary"
            >
              {isLoggingIn ? t("admin.loggingIn") : t("admin.login")}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
