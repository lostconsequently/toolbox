import { AlertOctagon, AlertTriangle, Info, XCircle } from "lucide-react";

import Badge from "./Badge";
import { useLanguage } from "../../context/LanguageContext";

const LEVEL_CONFIG = {
  info: { color: "var(--primary)", icon: Info, variant: "soft" },
  warning: {
    color: "var(--status-warning)",
    icon: AlertTriangle,
    variant: "soft",
  },
  error: { color: "var(--status-error)", icon: XCircle, variant: "soft" },
  critical: {
    color: "var(--status-error)",
    icon: AlertOctagon,
    variant: "solid",
  },
};

export default function LevelBadge({ level, compactMode = false }) {
  const { t } = useLanguage();

  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.info;
  const Icon = config.icon;

  return (
    <Badge
      label={t(`adminCenter.logging.level.${level}`)}
      color={config.color}
      variant={config.variant}
      compactMode={compactMode}
      icon={<Icon size={compactMode ? 11 : 12} />}
    />
  );
}
