import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { getStoredLanguage, translate } from "../i18n";
import ActionButton from "./toolForms/shared/ActionButton";

export default class WindowErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      `Tool window "${this.props.title || "unknown"}" crashed:`,
      error,
      info,
    );
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { title, onClose, children } = this.props;

    if (!error) {
      return children;
    }

    const language = getStoredLanguage();
    const t = (key) => translate(language, key);

    return (
      <div
        style={{
          position: "fixed",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          width: "min(360px, calc(100vw - 32px))",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          display: "grid",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={18} color="#f59e0b" />

          <strong style={{ color: "var(--text)" }}>
            {title
              ? `"${title}" — ${t("windowErrorBoundary.title")}`
              : t("windowErrorBoundary.title")}
          </strong>
        </div>

        <p style={{ margin: 0, color: "var(--subtle)", fontSize: "13px" }}>
          {t("windowErrorBoundary.message")}
        </p>

        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <ActionButton variant="secondary" onClick={this.handleRetry}>
            {t("windowErrorBoundary.retry")}
          </ActionButton>

          {onClose && (
            <ActionButton variant="danger" onClick={onClose}>
              {t("windowErrorBoundary.close")}
            </ActionButton>
          )}
        </div>
      </div>
    );
  }
}
