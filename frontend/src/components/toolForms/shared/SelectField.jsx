export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  compactMode = false,
}) {
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

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
