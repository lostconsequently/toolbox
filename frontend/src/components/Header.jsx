import { useSettings } from "../context/SettingsContext";
import Breadcrumb from "./shared/Breadcrumb";

export default function Header({ title, crumbs, style }) {
  const { settings } = useSettings();
  const compactMode = settings?.compactMode || false;

  return (
    <div
      style={{
        marginBottom: compactMode ? "20px" : "30px",
        ...style,
      }}
    >
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}

      <h1 style={{ margin: 0, fontSize: compactMode ? "20px" : undefined }}>
        {title}
      </h1>
    </div>
  );
}
