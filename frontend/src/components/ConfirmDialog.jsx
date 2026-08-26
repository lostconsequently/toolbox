import { useModalA11y } from "../hooks/useModalA11y";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import ActionRow from "./toolForms/shared/ActionRow";

export default function ConfirmDialog({
  open,
  title,
  message,
  danger = false,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();
  const containerRef = useModalA11y({ isOpen: open, onClose: onCancel });

  if (!open) {
    return null;
  }

  const resolvedTitle = title || t("confirmDialog.defaultTitle");
  const resolvedConfirmLabel = confirmLabel || t("common.yes");
  const resolvedCancelLabel = cancelLabel || t("common.no");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10001,
      }}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={resolvedTitle}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "10px",
            color: "var(--text)",
          }}
        >
          {resolvedTitle}
        </h3>

        <p
          style={{
            color: "var(--subtle)",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {message}
        </p>

        <ActionRow justify="flex-end" marginTop="0">
          <ActionButton variant="secondary" onClick={onCancel}>
            {resolvedCancelLabel}
          </ActionButton>

          <ActionButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </ActionButton>
        </ActionRow>
      </div>
    </div>
  );
}
