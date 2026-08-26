import { useState } from "react";

function copyViaExecCommand(value) {
  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const previousRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let succeeded = false;

  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);

  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }

  return succeeded;
}

export function useCopyToClipboard(timeoutMs = 1500) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async (value) => {
    if (!value) {
      return false;
    }

    let succeeded = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        succeeded = true;
      } catch {
        succeeded = false;
      }
    }

    if (!succeeded) {
      succeeded = copyViaExecCommand(value);
    }

    if (!succeeded) {
      setFailed(true);
      window.setTimeout(() => setFailed(false), timeoutMs);

      return false;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), timeoutMs);

    return true;
  };

  return [copied, copy, failed];
}
