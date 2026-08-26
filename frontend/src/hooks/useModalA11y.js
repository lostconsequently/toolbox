import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y({ isOpen, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement;
    const container = containerRef.current;

    const getFocusable = () =>
      Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
        (el) => el.offsetParent !== null,
      );

    const [firstFocusable] = getFocusable();
    (firstFocusable || container)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== "Tab" || !container) return;

      const focusable = getFocusable();

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
