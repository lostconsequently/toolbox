import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";

import FormField from "../components/toolForms/shared/FormField";
import ActionButton from "../components/toolForms/shared/ActionButton";
import StatusMessage from "../components/toolForms/shared/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE } from "../services/api";

const SSO_ERROR_KEYS = {
  sso_unavailable: "login.ssoErrors.unavailable",
  sso_misconfigured: "login.ssoErrors.misconfigured",
  sso_expired: "login.ssoErrors.expired",
  sso_denied: "login.ssoErrors.denied",
  sso_not_allowed: "login.ssoErrors.notAllowed",
  sso_error: "login.ssoErrors.generic",
};

export default function Login() {
  const { mode, ssoAvailable, user, loading, loginLocal } = useAuth();
  const {
    appName,
    logoUrl,
    loginTitle,
    loginSubtitle,
    loginWelcomeMessage,
    loginBackgroundUrl,
  } = useBranding();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const ssoError = searchParams.get("error");

    if (ssoError && SSO_ERROR_KEYS[ssoError]) {
      setError(t(SSO_ERROR_KEYS[ssoError]));
    }
  }, [searchParams, t]);

  const isLocalUsersMode = mode === "local_users";
  const showLocalForm =
    mode === "local" || mode === "hybrid" || isLocalUsersMode;
  const showSsoButton = ssoAvailable && (mode === "entra" || mode === "hybrid");

  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (isLocalUsersMode && !username.trim()) {
      setError(t("login.usernameRequired"));
      return;
    }

    if (!password.trim()) {
      setError(t("login.passwordRequired"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await loginLocal(
        password,
        isLocalUsersMode ? username.trim() : undefined,
      );
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || t("login.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSsoLogin = () => {
    window.location.href = `${API_BASE}/auth/entra/login`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: loginBackgroundUrl
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${loginBackgroundUrl})`
          : "var(--bg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
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
            src={logoUrl || "/favicon.svg"}
            alt={appName}
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
            {loginTitle || appName}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--subtle)",
              textAlign: "center",
            }}
          >
            {loginSubtitle || t("login.subtitle")}
          </p>

          {loginWelcomeMessage && (
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "var(--subtle)",
                textAlign: "center",
              }}
            >
              {loginWelcomeMessage}
            </p>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: "16px" }}>
            <StatusMessage status="error">{error}</StatusMessage>
          </div>
        )}

        {showSsoButton && (
          <div style={{ marginBottom: showLocalForm ? "20px" : 0 }}>
            <ActionButton
              variant="secondary"
              icon={<MicrosoftLogo />}
              disabled={submitting}
              onClick={handleSsoLogin}
            >
              {t("login.signInWithMicrosoft")}
            </ActionButton>
          </div>
        )}

        {showSsoButton && showLocalForm && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "20px 0",
              color: "var(--subtle)",
              fontSize: "12px",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
            {t("login.orDivider")}
            <div
              style={{ flex: 1, height: "1px", background: "var(--border)" }}
            />
          </div>
        )}

        {showLocalForm && (
          <div>
            {isLocalUsersMode && (
              <div style={{ marginBottom: "16px" }}>
                <FormField
                  label={t("login.usernameLabel")}
                  value={username}
                  onChange={setUsername}
                  placeholder={t("login.usernamePlaceholder")}
                  disabled={submitting}
                  autoFocus
                  autoComplete="username"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSubmit();
                    }
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <FormField
                label={t("login.passwordLabel")}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={t("login.passwordPlaceholder")}
                disabled={submitting}
                autoFocus={!isLocalUsersMode}
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSubmit();
                  }
                }}
              />
            </div>

            <ActionButton
              variant="primary"
              icon={<LogIn size={15} />}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? t("login.signingIn") : t("login.signIn")}
            </ActionButton>

            {!isLocalUsersMode && (
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <Link
                  to="/recover"
                  style={{ fontSize: "12px", color: "var(--subtle)" }}
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
