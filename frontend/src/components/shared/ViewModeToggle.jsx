import { useLanguage } from "../../context/LanguageContext";

export default function ViewModeToggle({
  value,
  onChange,
  options = ["cards", "list"],
  labels: labelsProp,
  compactMode = false,
  height,
}) {
  const { t } = useLanguage();

  const labels = labelsProp ?? {
    cards: t("viewMode.cards"),
    list: t("viewMode.list"),
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "3px",
        width: "fit-content",
        ...(height ? { height, boxSizing: "border-box" } : {}),
      }}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          style={{
            background: value === option ? "var(--primary)" : "transparent",
            color: "var(--text)",
            border: "none",
            borderRadius: "6px",
            padding: compactMode ? "5px 9px" : "7px 12px",
            cursor: "pointer",
            fontSize: compactMode ? "12px" : "13px",
          }}
        >
          {labels[option] || option}
        </button>
      ))}
    </div>
  );
}
