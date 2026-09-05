// Shared by the First Startup Wizard's BasicSettingsStep and Admin Center's
// GeneralTab - both need the same "IANA zone -> UTC offset label" list.
export function getUtcOffsetLabel(zone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());

    const offset = parts.find((part) => part.type === "timeZoneName")?.value;

    return offset ? offset.replace("GMT", "UTC") : "UTC";
  } catch {
    return "";
  }
}

export function getTimezoneOptions() {
  const guess = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  if (typeof Intl.supportedValuesOf === "function") {
    try {
      const zones = Intl.supportedValuesOf("timeZone");

      return { zones, guess };
    } catch {
      // Fall through to the curated fallback below.
    }
  }

  return {
    zones: [
      "UTC",
      "Europe/Amsterdam",
      "Europe/London",
      "Europe/Berlin",
      "Europe/Istanbul",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Australia/Sydney",
    ],
    guess,
  };
}

function parseOffsetMinutes(offsetLabel) {
  const match = /^UTC([+-])(\d{2}):(\d{2})$/.exec(offsetLabel);

  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;

  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

// IANA zone names are grouped as "Continent/City" - there's no data-driven
// way to say "Europe/Amsterdam is more recognizable than Africa/Ceuta" even
// though they can share a UTC offset, so this is a plain preference order
// used only to break ties when picking which single zone represents an
// offset. It doesn't affect which offsets exist, only which zone name shows
// for one.
const CONTINENT_PREFERENCE = [
  "Europe",
  "Africa",
  "Asia",
  "America",
  "Atlantic",
  "Indian",
  "Australia",
  "Pacific",
  "Antarctica",
];

function continentRank(zone) {
  const rank = CONTINENT_PREFERENCE.indexOf(zone.split("/")[0]);

  return rank === -1 ? CONTINENT_PREFERENCE.length : rank;
}

// A timezone dropdown with one option per IANA zone (~400 entries, a dozen+
// of them sharing the exact same UTC offset, e.g. every "Europe/*" zone at
// UTC+02:00 in summer) is both huge and redundant for picking "what time is
// it here". This collapses it to one option per distinct UTC offset,
// labelled and sorted by that offset instead of alphabetically by zone name.
//
// `preferredZones` (checked in order, e.g. [savedZone, browserGuess]) lets a
// caller guarantee a specific zone stays selectable and is shown as the
// representative for its offset, instead of silently disappearing from the
// list because some other zone at the same offset won the tie-break.
export function getGroupedTimezoneOptions({ preferredZones = [] } = {}) {
  const { zones, guess } = getTimezoneOptions();
  const preference = [...preferredZones, guess].filter(Boolean);

  const byOffset = new Map();

  for (const zone of zones) {
    const offsetLabel = getUtcOffsetLabel(zone);
    if (!offsetLabel) continue;

    const existing = byOffset.get(offsetLabel);

    if (!existing) {
      byOffset.set(offsetLabel, zone);
      continue;
    }

    const existingPreferenceRank = preference.indexOf(existing);
    const zonePreferenceRank = preference.indexOf(zone);

    if (
      zonePreferenceRank !== -1 &&
      (existingPreferenceRank === -1 || zonePreferenceRank < existingPreferenceRank)
    ) {
      byOffset.set(offsetLabel, zone);
      continue;
    }

    if (existingPreferenceRank !== -1) continue;

    const existingRank = continentRank(existing);
    const zoneRank = continentRank(zone);

    if (zoneRank < existingRank || (zoneRank === existingRank && zone < existing)) {
      byOffset.set(offsetLabel, zone);
    }
  }

  const options = Array.from(byOffset.entries())
    .map(([offsetLabel, zone]) => ({
      value: zone,
      label: `${offsetLabel} (${zone})`,
      offsetLabel,
    }))
    .sort(
      (a, b) => parseOffsetMinutes(a.offsetLabel) - parseOffsetMinutes(b.offsetLabel),
    );

  return { options, guess };
}
