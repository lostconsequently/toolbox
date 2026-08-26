export function runTool(tool, navigate) {
  if (!tool) return;

  if (tool.toolType === "link" && tool.config && !tool.config.includes("{{")) {
    window.open(tool.config, "_blank", "noopener,noreferrer");
    return;
  }

  navigate(`/tools?tool=${tool.id}`);
}
