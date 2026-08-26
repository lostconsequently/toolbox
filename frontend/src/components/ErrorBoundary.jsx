import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { getStoredLanguage, translate } from "../i18n";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unexpected application error:", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });

    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const language = getStoredLanguage();
    const t = (key) => translate(language, key);

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0f172a",
          color: "#f1f5f9",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            textAlign: "center",
            display: "grid",
            gap: "12px",
            justifyItems: "center",
          }}
        >
          <AlertTriangle size={32} color="#f59e0b" />

          <h2
            style={{
              margin: 0,
            }}
          >
            {t("errorBoundary.title")}
          </h2>

          <p
            style={{
              color: "#94a3b8",
              margin: 0,
            }}
          >
            {t("errorBoundary.message")}
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "8px",
              background: "#2563eb",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {t("errorBoundary.reload")}
          </button>
        </div>
      </div>
    );
  }
}
