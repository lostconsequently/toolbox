import { radius } from "../../core/tokens";

export default function ProgressBar({ progress = 0, label, compactMode = false }) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div>
      {label && (
        <div
          style={{
            marginBottom: "8px",
            fontSize: compactMode ? "12px" : "13px",
            color: "var(--subtle)",
          }}
        >
          {label}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          width: "100%",
          height: compactMode ? "8px" : "10px",
          borderRadius: radius.pill,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: "var(--primary)",
            borderRadius: radius.pill,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
