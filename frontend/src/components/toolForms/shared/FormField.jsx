import InfoTooltip from "../../shared/InfoTooltip";
import "../../../styles/hoverCard.css";

export default function FormField({
  label,
  hint,
  value,
  onChange,
  placeholder = "",
  type = "text",
  compactMode = false,
  mono = false,
  textarea = false,
  rows = 4,
  disabled = false,
  // Applied to the wrapper div (not the input/textarea itself, which
  // `...rest`'s own `className` already targets - e.g. "no-spinner") so a
  // caller can opt into the SubCategoryCard-style hover lift without
  // clashing with that separate mechanism.
  wrapperClassName = "",
  ...rest
}) {
  const baseStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: textarea ? "10px" : "0 10px",
    fontSize: compactMode ? "12px" : "13px",
    outline: "none",
    fontFamily: mono ? "var(--mono, monospace)" : "inherit",
  };

  return (
    <div className={wrapperClassName}>
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

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          {...rest}
          style={{
            ...baseStyle,
            minHeight: compactMode ? "80px" : "100px",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          {...rest}
          style={{
            ...baseStyle,
            height: compactMode ? "34px" : "38px",
          }}
        />
      )}
    </div>
  );
}
