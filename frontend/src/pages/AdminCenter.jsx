import { useState } from "react";
import {
  Database,
  Info,
  KeyRound,
  Palette,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";

import Header from "../components/Header";
import TabBar from "../components/shared/TabBar";
import StatusMessage from "../components/toolForms/shared/StatusMessage";
import AboutTab from "./AdminCenter/AboutTab";
import AuthenticationTab from "./AdminCenter/AuthenticationTab";
import BackupTab from "./AdminCenter/BackupTab";
import BrandingTab from "./AdminCenter/BrandingTab";
import GeneralTab from "./AdminCenter/GeneralTab";
import LoggingTab from "./AdminCenter/LoggingTab";
import { useAdmin } from "../context/AdminContext";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import { useConfirm } from "../hooks/useConfirm";

export default function AdminCenter() {
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const { confirm, dialog: confirmDialog } = useConfirm();

  const [activeTab, setActiveTab] = useState("general");
  const [notice, setNotice] = useState(null);

  return (
    <div>
      <Header
        title={t("adminCenter.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("adminCenter.title") },
        ]}
      />

      <TabBar
        tabs={[
          {
            id: "general",
            label: t("adminCenter.tabGeneral"),
            icon: <SlidersHorizontal size={15} />,
          },
          {
            id: "authentication",
            label: t("adminCenter.tabAuthentication"),
            icon: <KeyRound size={15} />,
          },
          {
            id: "branding",
            label: t("adminCenter.tabBranding"),
            icon: <Palette size={15} />,
          },
          {
            id: "backup",
            label: t("adminCenter.tabBackup"),
            icon: <Database size={15} />,
          },
          {
            id: "logging",
            label: t("adminCenter.tabLogging"),
            icon: <ScrollText size={15} />,
          },
          {
            id: "about",
            label: t("adminCenter.tabAbout"),
            icon: <Info size={15} />,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        compactMode={compactMode}
      />

      {confirmDialog}

      {!isAdmin && (
        <div style={{ marginBottom: "15px" }}>
          <StatusMessage status="warning" compactMode={compactMode}>
            {t("adminCenter.loginRequired")}
          </StatusMessage>
        </div>
      )}

      {notice && (
        <div style={{ marginBottom: "15px" }}>
          <StatusMessage status={notice.status} compactMode={compactMode}>
            {notice.message}
          </StatusMessage>
        </div>
      )}

      {activeTab === "general" && <GeneralTab />}

      {activeTab === "authentication" && (
        <AuthenticationTab confirm={confirm} setNotice={setNotice} />
      )}

      {activeTab === "branding" && (
        <BrandingTab confirm={confirm} setNotice={setNotice} />
      )}

      {activeTab === "backup" && (
        <BackupTab confirm={confirm} setNotice={setNotice} />
      )}

      {activeTab === "logging" && (
        <LoggingTab confirm={confirm} setNotice={setNotice} />
      )}

      {activeTab === "about" && <AboutTab />}
    </div>
  );
}
