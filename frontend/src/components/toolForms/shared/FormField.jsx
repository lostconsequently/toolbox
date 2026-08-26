export default function FormField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  compactMode = false,
  mono = false,
  textarea = false,
  rows = 4,
  disabled = false,
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
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            color: "var(--subtle)",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {label}
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
