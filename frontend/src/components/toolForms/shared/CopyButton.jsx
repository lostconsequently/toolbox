import { Copy } from "lucide-react";

import ActionButton from "./ActionButton";
import { useCopyToClipboard } from "./useCopyToClipboard";

export default function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Copy failed",
  compactMode = false,
  variant = "secondary",
  disabled = false,
}) {
  const [copied, copy, failed] = useCopyToClipboard();

  const copyValue = () => {
    if (!value || disabled) {
      return;
    }

    copy(value);
  };

  return (
    <ActionButton
      onClick={copyValue}
      icon={<Copy size={14} />}
      variant={variant}
      compactMode={compactMode}
      disabled={!value || disabled}
    >
      {failed ? failedLabel : copied ? copiedLabel : label}
    </ActionButton>
  );
}
