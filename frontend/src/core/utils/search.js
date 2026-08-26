import { FALLBACK_COLOR } from "../tokens";

function normalize(text) {
  return (text || "").toLowerCase();
}

function scoreNameMatch(name, term) {
  const lower = normalize(name);

  if (!lower) return 0;
  if (lower === term) return 100;
  if (lower.startsWith(term)) return 60;
  if (lower.includes(term)) return 40;

  return 0;
}

function includesTerm(value, term) {
  return normalize(value).includes(term);
}

export const FAVORITE_SCORE_BOOST = 25;
export const RECENT_SCORE_BOOST = 15;

export function scoreCategory(category, term) {
  return scoreNameMatch(category?.name, term);
}

export function scoreSubcategory(subcategory, category, term) {
  const nameScore = scoreNameMatch(subcategory?.name, term);

  if (nameScore > 0) return nameScore;

  return includesTerm(category?.name, term) ? 15 : 0;
}

export function scoreTool(
  tool,
  term,
  { category, subcategory, isFavorite, isRecent } = {},
) {
  let score = scoreNameMatch(tool?.name, term);

  if (score === 0) {
    const matchesOtherField =
      includesTerm(tool?.description, term) ||
      includesTerm(tool?.config, term) ||
      includesTerm(tool?.toolType, term) ||
      includesTerm(category?.name, term) ||
      includesTerm(subcategory?.name, term);

    if (!matchesOtherField) return 0;

    score = 15;
  }

  if (isFavorite) score += FAVORITE_SCORE_BOOST;
  if (isRecent) score += RECENT_SCORE_BOOST;

  return score;
}

export function scoreScript(
  script,
  term,
  { category, subcategory, isFavorite, isRecent } = {},
) {
  let score = scoreNameMatch(script?.title, term);

  if (score === 0) {
    const matchesOtherField =
      includesTerm(script?.description, term) ||
      includesTerm(script?.tags, term) ||
      includesTerm(script?.language, term) ||
      includesTerm(category?.name, term) ||
      includesTerm(subcategory?.name, term);

    if (!matchesOtherField) return 0;

    score = 15;
  }

  if (isFavorite) score += FAVORITE_SCORE_BOOST;
  if (isRecent) score += RECENT_SCORE_BOOST;

  return score;
}

export function scoreTemplate(template, term) {
  let score = scoreNameMatch(template?.label, term);

  if (score === 0) {
    const matchesOtherField = includesTerm(template?.shortDescription, term);

    if (!matchesOtherField) return 0;

    score = 15;
  }

  return score;
}

export function sortByScoreDesc(items) {
  return [...items].sort((a, b) => b.score - a.score);
}

const SEARCH_BADGE_COLORS = {
  CATEGORY: "#2563eb",
  SUBCATEGORY: "#7c3aed",
  TOOL: "#10b981",
  SCRIPT: "#8b5cf6",
  RECENT: "#0ea5e9",
  FAVORITE: "#f59e0b",
};

export function getSearchBadgeColor(badge) {
  return SEARCH_BADGE_COLORS[badge] || FALLBACK_COLOR;
}
