export default function ActionRow({
  children,
  marginTop,
  justify = "flex-start",
  compactMode = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: compactMode ? "8px" : "10px",
        marginTop: marginTop ?? (compactMode ? "10px" : "14px"),
        flexWrap: "wrap",
        justifyContent: justify,
      }}
    >
      {children}
    </div>
  );
}
