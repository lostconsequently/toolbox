import { radius, sectionPadding } from "../../core/tokens";

export default function SectionCard({ icon, title, compactMode, children }) {
  return (
    <div
      style={{
        padding: compactMode ? sectionPadding.compact : sectionPadding.normal,
        marginBottom: "16px",
        background: "var(--surface)",
        borderRadius: radius.lg,
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {icon}
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      {children}
    </div>
  );
}
