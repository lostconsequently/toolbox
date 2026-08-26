export default function FormSection({
  title,
  description,
  compactMode = false,
  children,
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "12px",
        background: "var(--overlay)",
        padding: compactMode ? "10px" : "14px",
      }}
    >
      {(title || description) && (
        <div
          style={{
            marginBottom: "12px",
          }}
        >
          {title && (
            <div
              style={{
                color: "var(--text)",
                fontSize: compactMode ? "13px" : "14px",
                fontWeight: "700",
                marginBottom: description ? "4px" : 0,
              }}
            >
              {title}
            </div>
          )}

          {description && (
            <div
              style={{
                color: "var(--subtle)",
                fontSize: compactMode ? "12px" : "13px",
                lineHeight: 1.5,
              }}
            >
              {description}
            </div>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
