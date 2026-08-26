export default function TabBar({
  tabs,
  activeTab,
  onChange,
  compactMode = false,
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        marginBottom: compactMode ? "12px" : "18px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="a11y-focus-ring"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isActive ? "var(--primary)" : "var(--surface)",
              color: isActive ? "#ffffff" : "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: compactMode ? "6px 12px" : "8px 14px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
