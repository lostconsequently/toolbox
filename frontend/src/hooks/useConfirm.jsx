import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";

export function useConfirm() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ message, ...options });
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setState(null);
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState(null);
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      title={state?.title}
      message={state?.message}
      danger={state?.danger}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
