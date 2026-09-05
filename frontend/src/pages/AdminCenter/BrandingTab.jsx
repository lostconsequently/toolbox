import { useEffect, useState } from "react";
import {
  Image,
  LogIn,
  Palette,
  RotateCcw,
  Type,
  Upload,
  X,
} from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ColorField from "../../components/toolForms/shared/ColorField";
import FormField from "../../components/toolForms/shared/FormField";
import Card from "../../components/shared/Card";
import InfoTooltip from "../../components/shared/InfoTooltip";
import { useAdmin } from "../../context/AdminContext";
import { useBranding } from "../../context/BrandingContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { api, toBackendUrl } from "../../services/api";
import { cardPadding, stackedFieldMaxWidth } from "../../core/tokens";
import "../../styles/hoverCard.css";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

export default function BrandingTab({ confirm, setNotice }) {
  const { isAdmin } = useAdmin();
  const { refresh: refreshBranding } = useBranding();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const [appName, setAppName] = useState("");
  const [tagline, setTagline] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [loginTitle, setLoginTitle] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [loginWelcomeMessage, setLoginWelcomeMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [logoUrl, setLogoUrl] = useState(null);
  const [faviconUrl, setFaviconUrl] = useState(null);
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(null);

  const loadConfig = () =>
    api.getBranding().then((config) => {
      setAppName(config.appName || "");
      setTagline(config.tagline || "");
      setCompanyName(config.companyName || "");
      setPrimaryColor(config.primaryColor || "");
      setAccentColor(config.accentColor || "");
      setLoginTitle(config.loginTitle || "");
      setLoginSubtitle(config.loginSubtitle || "");
      setLoginWelcomeMessage(config.loginWelcomeMessage || "");
      setLogoUrl(toBackendUrl(config.logoUrl));
      setFaviconUrl(toBackendUrl(config.faviconUrl));
      setLoginBackgroundUrl(toBackendUrl(config.loginBackgroundUrl));

      return config;
    });

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    loadConfig().catch((err) => {
      if (!ignore) console.error(err);
    });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleImageUpload = async (slot, file) => {
    try {
      await api.uploadBrandingImage(slot, file);
      await loadConfig();
      await refreshBranding();
      setNotice({
        status: "success",
        message: t("adminCenter.branding.imageUploadSuccess"),
      });
    } catch (err) {
      console.error(err);
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.branding.imageUploadFailed"),
      });
      throw err;
    }
  };

  const handleImageRemove = async (slot) => {
    try {
      await api.removeBrandingImage(slot);
      await loadConfig();
      await refreshBranding();
      setNotice({
        status: "success",
        message: t("adminCenter.branding.imageRemoveSuccess"),
      });
    } catch (err) {
      console.error(err);
      setNotice({
        status: "error",
        message: err.message || t("adminCenter.branding.imageRemoveFailed"),
      });
      throw err;
    }
  };

  const colorError =
    (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor)) ||
    (accentColor && !HEX_COLOR_PATTERN.test(accentColor));

  const save = async () => {
    setSaving(true);
    setNotice(null);

    try {
      await api.updateBranding({
        appName: appName.trim(),
        tagline: tagline.trim(),
        companyName: companyName.trim(),
        primaryColor: primaryColor.trim(),
        accentColor: accentColor.trim(),
        loginTitle: loginTitle.trim(),
        loginSubtitle: loginSubtitle.trim(),
        loginWelcomeMessage: loginWelcomeMessage.trim(),
      });

      setNotice({
        status: "success",
        message: t("adminCenter.branding.saveSuccess"),
      });

      await refreshBranding();
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.branding.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    const confirmed = await confirm(t("adminCenter.branding.resetConfirm"), {
      danger: true,
    });

    if (!confirmed) return;

    setResetting(true);
    setNotice(null);

    try {
      const config = await api.resetBranding();

      setAppName(config.appName || "");
      setTagline(config.tagline || "");
      setCompanyName(config.companyName || "");
      setPrimaryColor(config.primaryColor || "");
      setAccentColor(config.accentColor || "");
      setLoginTitle(config.loginTitle || "");
      setLoginSubtitle(config.loginSubtitle || "");
      setLoginWelcomeMessage(config.loginWelcomeMessage || "");
      setLogoUrl(toBackendUrl(config.logoUrl));
      setFaviconUrl(toBackendUrl(config.faviconUrl));
      setLoginBackgroundUrl(toBackendUrl(config.loginBackgroundUrl));

      setNotice({
        status: "success",
        message: t("adminCenter.branding.resetSuccess"),
      });

      await refreshBranding();
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.branding.resetFailed"),
      });
    } finally {
      setResetting(false);
    }
  };

  const cardStyle = {
    padding: compactMode ? cardPadding.compact : cardPadding.normal,
    marginBottom: compactMode ? cardPadding.compact : cardPadding.normal,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, 1fr)",
        gap: compactMode ? "14px" : "20px",
        alignItems: "start",
      }}
    >
      <div style={{ opacity: isAdmin ? 1 : 0.6 }}>
        <Card style={cardStyle} hoverLift={false}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Type size={16} />
            <h3 style={{ margin: 0 }}>
              {t("adminCenter.branding.identityHeading")}
            </h3>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <FormField
              label={t("adminCenter.branding.appNameLabel")}
              value={appName}
              onChange={setAppName}
              placeholder="Toolbox"
              disabled={!isAdmin}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />

            <FormField
              label={t("adminCenter.branding.taglineLabel")}
              value={tagline}
              onChange={setTagline}
              placeholder={t("adminCenter.branding.taglinePlaceholder")}
              disabled={!isAdmin}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />

            <FormField
              label={t("adminCenter.branding.companyNameLabel")}
              value={companyName}
              onChange={setCompanyName}
              placeholder={t("adminCenter.branding.companyNamePlaceholder")}
              disabled={!isAdmin}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />
          </div>
        </Card>

        <Card style={cardStyle} hoverLift={false}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Image size={16} />
            <h3 style={{ margin: 0 }}>
              {t("adminCenter.branding.logoHeading")}
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            <ImageUploadField
              label={t("adminCenter.branding.logoLabel")}
              hint={t("adminCenter.branding.logoHint")}
              currentUrl={logoUrl}
              shape="square"
              accept={IMAGE_ACCEPT}
              disabled={!isAdmin}
              compactMode={compactMode}
              onUpload={(file) => handleImageUpload("logo", file)}
              onRemove={() => handleImageRemove("logo")}
            />

            <ImageUploadField
              label={t("adminCenter.branding.faviconLabel")}
              hint={t("adminCenter.branding.faviconHint")}
              currentUrl={faviconUrl}
              shape="square"
              accept={IMAGE_ACCEPT}
              disabled={!isAdmin}
              compactMode={compactMode}
              onUpload={(file) => handleImageUpload("favicon", file)}
              onRemove={() => handleImageRemove("favicon")}
            />

            <ImageUploadField
              label={t("adminCenter.branding.loginBackgroundLabel")}
              hint={t("adminCenter.branding.loginBackgroundHint")}
              currentUrl={loginBackgroundUrl}
              shape="wide"
              accept={IMAGE_ACCEPT}
              disabled={!isAdmin}
              compactMode={compactMode}
              onUpload={(file) => handleImageUpload("login-background", file)}
              onRemove={() => handleImageRemove("login-background")}
            />
          </div>
        </Card>

        <Card style={cardStyle} hoverLift={false}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Palette size={16} />
            <h3 style={{ margin: 0 }}>
              {t("adminCenter.branding.themeHeading")}
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "14px",
              maxWidth: stackedFieldMaxWidth,
            }}
          >
            <ColorField
              label={t("adminCenter.branding.primaryColorLabel")}
              hint={t("adminCenter.branding.primaryColorHint")}
              value={primaryColor}
              onChange={setPrimaryColor}
              disabled={!isAdmin}
              compactMode={compactMode}
              className="hover-card"
            />

            <ColorField
              label={t("adminCenter.branding.accentColorLabel")}
              hint={t("adminCenter.branding.accentColorHint")}
              value={accentColor}
              onChange={setAccentColor}
              disabled={!isAdmin}
              compactMode={compactMode}
              className="hover-card"
            />
          </div>

          {colorError && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--status-error)",
                marginTop: "12px",
              }}
            >
              {t("adminCenter.branding.invalidColor")}
            </div>
          )}
        </Card>

        <Card style={cardStyle} hoverLift={false}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <LogIn size={16} />
            <h3 style={{ margin: 0 }}>
              {t("adminCenter.branding.loginHeading")}
            </h3>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <FormField
              label={t("adminCenter.branding.loginTitleLabel")}
              value={loginTitle}
              onChange={setLoginTitle}
              placeholder="Toolbox"
              disabled={!isAdmin}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />

            <FormField
              label={t("adminCenter.branding.loginSubtitleLabel")}
              value={loginSubtitle}
              onChange={setLoginSubtitle}
              placeholder={t("login.subtitle")}
              disabled={!isAdmin}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />

            <FormField
              label={t("adminCenter.branding.loginWelcomeMessageLabel")}
              hint={t("adminCenter.branding.loginWelcomeMessageHint")}
              value={loginWelcomeMessage}
              onChange={setLoginWelcomeMessage}
              placeholder={t(
                "adminCenter.branding.loginWelcomeMessagePlaceholder",
              )}
              disabled={!isAdmin}
              textarea
              rows={2}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />
          </div>
        </Card>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <ActionButton
            disabled={!isAdmin || saving || Boolean(colorError)}
            variant="primary"
            onClick={save}
            compactMode={compactMode}
          >
            {saving
              ? t("adminCenter.branding.saving")
              : t("adminCenter.branding.save")}
          </ActionButton>

          <ActionButton
            disabled={!isAdmin || resetting}
            variant="secondary"
            icon={<RotateCcw size={14} />}
            onClick={resetToDefault}
            compactMode={compactMode}
          >
            {resetting
              ? t("adminCenter.branding.resetting")
              : t("adminCenter.branding.resetToDefault")}
          </ActionButton>
        </div>
      </div>

      <BrandingPreview
        appName={appName || "Toolbox"}
        tagline={tagline}
        loginTitle={loginTitle || appName || "Toolbox"}
        loginSubtitle={loginSubtitle || t("login.subtitle")}
        loginWelcomeMessage={loginWelcomeMessage}
        primaryColor={
          primaryColor && HEX_COLOR_PATTERN.test(primaryColor)
            ? primaryColor
            : null
        }
        logoUrl={logoUrl}
        loginBackgroundUrl={loginBackgroundUrl}
        compactMode={compactMode}
      />
    </div>
  );
}

function ImageUploadField({
  label,
  hint,
  currentUrl,
  shape,
  accept,
  disabled,
  compactMode,
  onUpload,
  onRemove,
}) {
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const boxHeight = shape === "wide" ? "80px" : compactMode ? "64px" : "80px";

  const handleSelect = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      await onUpload(selectedFile);
      cancelSelection();
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);

    try {
      await onRemove();
    } catch {
    } finally {
      setRemoving(false);
    }
  };

  const displayUrl = previewUrl || currentUrl;

  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
          color: "var(--subtle)",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {label}
        {hint && <InfoTooltip text={hint} />}
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: boxHeight,
          borderRadius: "8px",
          background: "var(--surface)",
          border: "1px dashed var(--border)",
          marginBottom: "8px",
          overflow: "hidden",
        }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: shape === "wide" ? "cover" : "contain",
              width: shape === "wide" ? "100%" : undefined,
              height: shape === "wide" ? "100%" : undefined,
            }}
          />
        ) : (
          <Image size={20} color="var(--subtle)" />
        )}
      </div>

      {selectedFile ? (
        <div style={{ display: "flex", gap: "6px" }}>
          <ActionButton
            variant="primary"
            compactMode
            disabled={uploading}
            onClick={confirmUpload}
            className="hover-card"
          >
            {uploading
              ? t("adminCenter.branding.uploading")
              : t("adminCenter.branding.confirmUpload")}
          </ActionButton>

          <ActionButton
            variant="secondary"
            compactMode
            disabled={uploading}
            onClick={cancelSelection}
            className="hover-card"
          >
            {t("common.cancel")}
          </ActionButton>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <label
            className="a11y-focus-ring hover-card"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: compactMode ? "5px 10px" : "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: compactMode ? "12px" : "13px",
              fontWeight: "600",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Upload size={13} />
            {currentUrl
              ? t("adminCenter.branding.replace")
              : t("adminCenter.branding.upload")}
            <input
              type="file"
              accept={accept}
              onChange={handleSelect}
              disabled={disabled}
              style={{ display: "none" }}
            />
          </label>

          {currentUrl && (
            <ActionButton
              variant="danger"
              compactMode
              icon={<X size={13} />}
              disabled={disabled || removing}
              onClick={handleRemove}
              className="hover-card"
            >
              {removing
                ? t("adminCenter.branding.removing")
                : t("adminCenter.branding.remove")}
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}

function BrandingPreview({
  appName,
  tagline,
  loginTitle,
  loginSubtitle,
  loginWelcomeMessage,
  primaryColor,
  logoUrl,
  loginBackgroundUrl,
  compactMode,
}) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        position: "sticky",
        top: "20px",
        background: "var(--card)",
        padding: compactMode ? "14px" : "20px",
        borderRadius: "12px",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <Palette size={16} />
        <h3 style={{ margin: 0 }}>
          {t("adminCenter.branding.previewHeading")}
        </h3>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--subtle)",
            marginBottom: "6px",
          }}
        >
          {t("adminCenter.branding.previewHeader")}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src={logoUrl || "/favicon.svg"}
            alt=""
            style={{ width: "24px", height: "24px", objectFit: "contain" }}
          />

          <div>
            <strong style={{ fontSize: "14px" }}>{appName}</strong>

            {tagline && (
              <div style={{ fontSize: "11px", color: "var(--subtle)" }}>
                {tagline}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--subtle)",
            marginBottom: "6px",
          }}
        >
          {t("adminCenter.branding.previewLogin")}
        </div>

        <div
          style={{
            padding: "20px 16px",
            borderRadius: "8px",
            background: loginBackgroundUrl
              ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${loginBackgroundUrl})`
              : "var(--surface)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <img
            src={logoUrl || "/favicon.svg"}
            alt=""
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              marginBottom: "8px",
            }}
          />

          <div style={{ fontWeight: "700", fontSize: "15px" }}>
            {loginTitle}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "var(--subtle)",
              marginTop: "4px",
            }}
          >
            {loginSubtitle}
          </div>

          {loginWelcomeMessage && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--subtle)",
                marginTop: "4px",
              }}
            >
              {loginWelcomeMessage}
            </div>
          )}

          <div
            style={{
              marginTop: "12px",
              padding: "8px",
              borderRadius: "6px",
              background: primaryColor || "var(--primary)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {t("login.signIn")}
          </div>
        </div>
      </div>
    </div>
  );
}
