import InfoTooltip from "../../shared/InfoTooltip";
import "../../../styles/hoverCard.css";

export default function SelectField({
  label,
  hint,
  value,
  onChange,
  options = [],
  compactMode = false,
  disabled = false,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
            color: "var(--subtle)",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {label}
          {hint && <InfoTooltip text={hint} />}
        </label>
      )}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          height: compactMode ? "34px" : "38px",
          boxSizing: "border-box",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0 10px",
          fontSize: compactMode ? "12px" : "13px",
          outline: "none",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
