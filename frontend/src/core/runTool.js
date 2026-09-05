export function runTool(tool, navigate) {
  if (!tool) return;

  navigate(`/tools?tool=${tool.id}`);
}
