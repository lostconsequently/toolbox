import { api } from "../../services/api";

export async function flattenSpf({ domain = "", spfRecord = "" } = {}) {
  return api.flattenSpf({ domain, spfRecord });
}

export async function runSpfFlattenTool(tool, inputValues) {
  return flattenSpf(inputValues);
}
