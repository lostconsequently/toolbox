import { Download, Power, Settings2, Star, Trash2 } from "lucide-react";
import Icon from "../Icon";
import Badge from "../shared/Badge";
import Card from "../shared/Card";
import CardMenu from "../shared/CardMenu";
import ActionButton from "../toolForms/shared/ActionButton";
import {
  getToolStatus,
  getToolStatusColor,
  getToolStatusIcon,
} from "../../core/toolStatus";
import {
  getMarketplaceCategoryColor,
  getMarketplaceCategoryLabel,
} from "../../core/marketplaceCategories";
import { useLanguage } from "../../context/LanguageContext";

export default function TemplateCatalogCard({
  toolType,
  definition,
  tool,
  isAdmin,
  compactMode = false,
  selected = false,
  onToggleSelect,
  onInstall,
  onConfigure,
  onToggleEnabled,
  onToggleFeatured,
  onUninstall,
}) {
  const { t } = useLanguage();
  const status = getToolStatus(tool);
  const statusColor = getToolStatusColor(status);
  const StatusIcon = getToolStatusIcon(status);
  const categoryColor = getMarketplaceCategoryColor(
    definition.marketplaceCategory,
  );

  const isInstalled = Boolean(tool);
  const name = tool?.name || definition.label;
  const isClickable = isAdmin && isInstalled;

  return (
    <Card
      hoverShadow
      className={isClickable ? "hover-card-glow" : ""}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => onConfigure(tool) : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onConfigure(tool);
              }
            }
          : undefined
      }
      aria-label={
        isClickable
          ? t("toolsCenter.actionConfigureTitle", { name })
          : undefined
      }
      style={{
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: "196px",
        opacity: !isAdmin ? 0.6 : status === "notInstalled" ? 0.85 : 1,
        cursor: isClickable ? "pointer" : "default",
        outline: "none",
        borderColor: selected ? "var(--primary)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        {isAdmin && isInstalled && onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleSelect(tool)}
            aria-label={t("toolsCenter.bulkSelectItem", { name })}
            style={{ marginTop: "4px", flexShrink: 0, cursor: "pointer" }}
          />
        )}

        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "12px",
            background: "var(--overlay)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={tool?.icon || definition.icon} size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "700",
                color: "var(--text)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={name}
            >
              {name}
            </h3>

            {tool?.featured && (
              <Star
                size={13}
                fill="var(--primary)"
                color="var(--primary)"
                style={{ flexShrink: 0 }}
                aria-label={t("toolsCenter.statusFeatured")}
              />
            )}
          </div>
        </div>

        {isInstalled ? (
          <CardMenu
            ariaLabel={t("toolsCenter.moreActions", { name })}
            disabled={!isAdmin}
            items={[
              {
                label: t("toolsCenter.actionConfigure"),
                icon: <Settings2 size={14} />,
                onClick: () => onConfigure(tool),
              },
              {
                label: tool.enabled
                  ? t("toolsCenter.actionDisable")
                  : t("toolsCenter.actionEnable"),
                icon: <Power size={14} />,
                onClick: () => onToggleEnabled(tool),
              },
              {
                label: tool.featured
                  ? t("toolsCenter.actionUnfeature")
                  : t("toolsCenter.actionFeature"),
                icon: <Star size={14} />,
                onClick: () => onToggleFeatured(tool),
              },
              {
                label: t("toolsCenter.actionUninstall"),
                icon: <Trash2 size={14} />,
                onClick: () => onUninstall(tool),
                danger: true,
              },
            ]}
          />
        ) : null}
      </div>

      <p
        style={{
          margin: 0,
          flexGrow: 1,
          fontSize: "13px",
          color: "var(--subtle)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {tool?.description || definition.shortDescription}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Badge
          label={getMarketplaceCategoryLabel(definition.marketplaceCategory)}
          color={categoryColor}
          variant="solid"
          compactMode={compactMode}
        />

        <div style={{ marginLeft: "auto" }}>
          <Badge
            label={t(
              `toolsCenter.status${status[0].toUpperCase()}${status.slice(1)}`,
            )}
            color={statusColor}
            variant="soft"
            compactMode={compactMode}
            icon={<StatusIcon size={12} />}
          />
        </div>
      </div>

      {!isInstalled && (
        <ActionButton
          icon={<Download size={13} />}
          variant="primary"
          compactMode={compactMode}
          disabled={!isAdmin}
          onClick={(event) => {
            event.stopPropagation();
            onInstall(toolType);
          }}
          title={
            isAdmin
              ? t("toolsCenter.actionInstallTitle", { name: definition.label })
              : t("common.adminRequired")
          }
        >
          {t("toolsCenter.actionInstall")}
        </ActionButton>
      )}
    </Card>
  );
}
