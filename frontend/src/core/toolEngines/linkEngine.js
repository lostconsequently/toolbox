export async function runLinkTool(tool, inputValues) {
  let finalUrl = tool.config;

  Object.entries(inputValues).forEach(([key, value]) => {
    finalUrl = finalUrl.replaceAll(
      `{{${key}}}`,
      encodeURIComponent(value || ""),
    );
  });

  window.open(finalUrl, "_blank", "noopener,noreferrer");

  return { opened: true, url: finalUrl };
}
