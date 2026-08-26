export default function ToolFormLayout({ children, gap, compactMode = false }) {
  return (
    <div
      style={{
        display: "grid",
        gap: gap ?? (compactMode ? "10px" : "14px"),
      }}
    >
      {children}
    </div>
  );
}
