import { HelpCircle } from "lucide-react";
import "../../styles/infoTooltip.css";

// A small hover/focus-triggered popup for a field's helper text, used
// instead of always printing that text below the field - keeps forms
// compact while the explanation is still one hover away.
export default function InfoTooltip({ text }) {
  if (!text) return null;

  return (
    <span className="info-tooltip" tabIndex={0}>
      <HelpCircle size={13} color="var(--subtle)" />
      <span className="info-tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
