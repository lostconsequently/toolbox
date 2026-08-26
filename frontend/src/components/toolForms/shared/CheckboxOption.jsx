export default function CheckboxOption({
  label,
  checked,
  onChange,
  compactMode = false,
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: compactMode ? "6px" : "8px",
        color: "var(--text)",
        fontSize: compactMode ? "12px" : "13px",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />

      {label}
    </label>
  );
}
