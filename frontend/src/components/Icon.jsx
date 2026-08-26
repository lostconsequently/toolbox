import { ICONS, DEFAULT_ICON } from "../config/icons";

export default function Icon({ name, size = 20, color }) {
  const IconComponent = ICONS[name] || DEFAULT_ICON;

  return <IconComponent size={size} color={color} />;
}
