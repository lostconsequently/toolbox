export default function ResultGrid({
  children,
  minWidth = "180px",
  gap,
  compactMode = false,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${compactMode ? "150px" : minWidth}, 1fr))`,
        gap: gap ?? (compactMode ? "8px" : "10px"),
      }}
    >
      {children}
    </div>
  );
}
