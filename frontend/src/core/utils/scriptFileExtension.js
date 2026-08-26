export const SCRIPT_LANGUAGE_EXTENSIONS = {
  PowerShell: "ps1",
  Bash: "sh",
  Batch: "bat",
  SQL: "sql",
  Docker: "yml",
  YAML: "yml",
  JSON: "json",
  Other: "txt",
};

export function getScriptFileExtension(language) {
  return SCRIPT_LANGUAGE_EXTENSIONS[language] || "txt";
}
