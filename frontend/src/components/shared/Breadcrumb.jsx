import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { useLanguage } from "../../context/LanguageContext";

export default function Breadcrumb({ items }) {
  const { t } = useLanguage();

  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label={t("common.breadcrumb")}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "4px",
        fontSize: "13px",
        color: "var(--subtle)",
        marginBottom: "6px",
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span
            key={`${item.label}-${index}`}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            {index > 0 && <ChevronRight size={12} aria-hidden="true" />}

            {item.to && !isLast ? (
              <Link
                to={item.to}
                style={{
                  color: "var(--subtle)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? "var(--text)" : "var(--subtle)" }}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
