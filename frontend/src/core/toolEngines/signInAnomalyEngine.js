import { parseDelimited, detectDelimiter, matchHeaders } from "../utils/csv";

const HEADER_RULES = [
  {
    field: "user",
    label: "User",
    keywords: ["userprincipalname", "userdisplayname", "username", "user"],
  },
  {
    field: "timestamp",
    label: "Timestamp",
    keywords: [
      "createddatetimeutc",
      "createddatetime",
      "datetimeutc",
      "signindate",
      "date",
      "timestamp",
    ],
  },
  { field: "ip", label: "IP address", keywords: ["ipaddress", "ip"] },
  { field: "country", label: "Land", keywords: ["countryorregion", "country"] },
  { field: "city", label: "City", keywords: ["city"] },
  { field: "location", label: "Location", keywords: ["location"] },
  {
    field: "device",
    label: "Device",
    keywords: ["devicedisplayname", "device"],
  },
  {
    field: "os",
    label: "Operating system",
    keywords: ["operatingsystem", "os"],
  },
  { field: "browser", label: "Browser", keywords: ["browser"] },
  {
    field: "clientApp",
    label: "Client app",
    keywords: ["clientappused", "clientapp", "client"],
  },
  {
    field: "errorCode",
    label: "Error code",
    keywords: ["signinerrorcode", "errorcode"],
  },
  { field: "status", label: "Status", keywords: ["status"] },
  {
    field: "failureReason",
    label: "Failure reason",
    keywords: ["failurereason", "reason"],
  },
];

const LEGACY_CLIENT_APPS = new Set([
  "imap4",
  "imap",
  "pop3",
  "pop",
  "smtp",
  "authenticatedsmtp",
  "exchangeactivesync",
  "mapioverhttp",
  "offlineaddressbook",
  "otherclients",
  "exchangeonlineremotepowershell",
  "reportingwebservices",
]);

const WEIGHTS = {
  failedLogin: 5,
  bruteForce: 15,
  passwordSpray: 25,
  impossibleTravel: 30,
  concurrentLocations: 20,
  unusualCountry: 15,
  outsideBusinessHours: 5,
  newDevice: 5,
  legacyAuthFailed: 10,
  legacyAuthSuccess: 20,
  unknownIp: 10,
};

export const ANOMALY_TYPES = {
  impossibleTravel: {
    label: "Impossible Travel",
    severity: "error",
    description:
      "Country changed within a window that physical travel does not allow.",
  },
  passwordSpray: {
    label: "Password Spray",
    severity: "error",
    description:
      "Multiple users with failed attempts from the same IP within a short time.",
  },
  bruteForce: {
    label: "Brute-force",
    severity: "error",
    description: "Many failed attempts for a single user within a short time.",
  },
  concurrentLocations: {
    label: "Simultaneous sign-ins from different locations",
    severity: "error",
    description:
      "Successful sign-ins from different locations in quick succession.",
  },
  legacyAuth: {
    label: "Legacy Authentication",
    severity: "warning",
    description:
      "Sign-in over a legacy protocol that can bypass MFA/Conditional Access.",
  },
  unusualCountry: {
    label: "Unusual country",
    severity: "warning",
    description: "Sign-in from a country that does not fit the usual pattern.",
  },
  multipleFailedLogins: {
    label: "Multiple failed sign-ins",
    severity: "warning",
    description: "User with a notable number of failed attempts.",
  },
  unknownIp: {
    label: "Unknown IP address",
    severity: "warning",
    description:
      "IP shared by multiple users, or seen once on a failed attempt.",
  },
  newDevice: {
    label: "New device/browser",
    severity: "neutral",
    description:
      "Device/browser combination that appears only once in this log.",
  },
  outsideBusinessHours: {
    label: "Outside working hours",
    severity: "neutral",
    description: "Sign-in outside the configured working hours.",
  },
};

const ACTION_PRIORITY = [
  [
    "impossibleTravel",
    "Reset the password, revoke all active sessions and review MFA methods.",
  ],
  [
    "passwordSpray",
    "Block the source IP, review Smart Lockout/Conditional Access and enforce MFA.",
  ],
  [
    "bruteForce",
    "Temporarily lock the account, reset the password and review the lockout policy.",
  ],
  [
    "concurrentLocations",
    "Revoke sessions and check for token theft (e.g. AiTM phishing).",
  ],
  [
    "legacyAuth",
    "Disable legacy authentication through Conditional Access and check for MFA bypass.",
  ],
  [
    "unusualCountry",
    "Confirm with the user whether the travel was planned; consider location-based Conditional Access.",
  ],
  ["multipleFailedLogins", "Check with the user; consider a password reset."],
  ["unknownIp", "Check where the IP address originates."],
  ["newDevice", "Ask the user to confirm and check device compliance."],
  [
    "outsideBusinessHours",
    "Combine with other signals; only act when it coincides with other anomalies.",
  ],
];

export const DEFAULT_OPTIONS = {
  businessStartHour: 7,
  businessEndHour: 19,
  timezoneOffsetMinutes: 60,
  expectedCountries: [],
  failedLoginThreshold: 3,
  bruteForceWindowMinutes: 10,
  bruteForceThreshold: 5,
  passwordSprayWindowMinutes: 60,
  passwordSprayDistinctUsers: 5,
  impossibleTravelWindowHours: 3,
  concurrentWindowMinutes: 10,
};

function parseTimestamp(raw) {
  if (!raw) return null;
  const ms = new Date(String(raw).trim()).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalizeClientApp(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function deriveSuccess(row) {
  if (row.status) {
    const normalized = row.status.trim().toLowerCase();
    if (normalized.includes("success") || normalized.includes("succeeded"))
      return true;
    if (normalized.includes("fail") || normalized.includes("failed"))
      return false;
  }

  if (row.errorCode !== undefined && String(row.errorCode).trim() !== "") {
    return String(row.errorCode).trim() === "0";
  }

  return true;
}

function splitLocation(row) {
  let country = row.country || "";
  let city = row.city || "";

  if (!country && row.location) {
    const parts = row.location.split(",").map((part) => part.trim());

    if (parts.length > 1) {
      country = parts[parts.length - 1];
      city = city || parts.slice(0, -1).join(", ");
    } else {
      country = parts[0];
    }
  }

  return { country, city };
}

function normalizeDelimitedRows(text) {
  const table = parseDelimited(text, detectDelimiter(text));

  if (table.length < 2) {
    return { events: [], detectedColumns: [] };
  }

  const [headerRow, ...dataRows] = table;
  const { map: fieldMap, detected } = matchHeaders(headerRow, HEADER_RULES);

  const events = dataRows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((cells) => {
      const row = {};
      Object.entries(fieldMap).forEach(([field, index]) => {
        row[field] = (cells[index] || "").trim();
      });

      const { country, city } = splitLocation(row);

      return {
        user: row.user || "Unknown",
        timestampRaw: row.timestamp || "",
        timestampMs: parseTimestamp(row.timestamp),
        ip: row.ip || "",
        country,
        city,
        device: row.device || "",
        os: row.os || "",
        browser: row.browser || "",
        clientApp: row.clientApp || "",
        success: deriveSuccess(row),
        errorCode: row.errorCode || "",
        failureReason: row.failureReason || "",
      };
    });

  return { events, detectedColumns: detected };
}

function normalizeJsonEvents(parsed) {
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.value)
      ? parsed.value
      : null;

  if (!list) return null;

  return list.map((item) => {
    const status = item.status || {};
    const device = item.deviceDetail || {};
    const location = item.location || {};
    const errorCode =
      status.errorCode !== undefined && status.errorCode !== null
        ? String(status.errorCode)
        : "";

    return {
      user: item.userPrincipalName || item.userDisplayName || "Unknown",
      timestampRaw: item.createdDateTime || "",
      timestampMs: parseTimestamp(item.createdDateTime),
      ip: item.ipAddress || "",
      country: location.countryOrRegion || "",
      city: location.city || "",
      device: device.displayName || "",
      os: device.operatingSystem || "",
      browser: device.browser || "",
      clientApp: item.clientAppUsed || "",
      success: errorCode === "" ? true : errorCode === "0",
      errorCode,
      failureReason: status.failureReason || "",
    };
  });
}

function detectInputAndParse(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const events = normalizeJsonEvents(parsed);

      if (events) {
        return { inputType: "json", events, detectedColumns: [] };
      }
    } catch {}
  }

  const { events, detectedColumns } = normalizeDelimitedRows(text);
  return { inputType: "delimited", events, detectedColumns };
}

function addHit(hitsByEvent, index, type, weight, note) {
  if (!hitsByEvent.has(index)) {
    hitsByEvent.set(index, []);
  }

  hitsByEvent.get(index).push({ type, weight, note });
}

function detectLegacyAuth(events, hitsByEvent) {
  events.forEach((event, index) => {
    if (!event.clientApp) return;

    const normalized = normalizeClientApp(event.clientApp);

    if (LEGACY_CLIENT_APPS.has(normalized)) {
      addHit(
        hitsByEvent,
        index,
        "legacyAuth",
        event.success ? WEIGHTS.legacyAuthSuccess : WEIGHTS.legacyAuthFailed,
        `Legacy client app: ${event.clientApp}`,
      );
    }
  });
}

function detectFailedLogins(events, hitsByEvent, options) {
  const failuresByUser = new Map();

  events.forEach((event, index) => {
    if (event.success) return;

    addHit(
      hitsByEvent,
      index,
      "failedLoginBase",
      WEIGHTS.failedLogin,
      "Failed sign-in",
    );

    if (!failuresByUser.has(event.user)) {
      failuresByUser.set(event.user, []);
    }

    failuresByUser.get(event.user).push(index);
  });

  failuresByUser.forEach((indices) => {
    if (indices.length >= options.failedLoginThreshold) {
      indices.forEach((index) => {
        addHit(
          hitsByEvent,
          index,
          "multipleFailedLogins",
          0,
          `Part of ${indices.length} failed attempts by this user`,
        );
      });
    }
  });
}

function detectBruteForce(events, hitsByEvent, options) {
  const windowMs = options.bruteForceWindowMinutes * 60_000;
  const byUser = new Map();

  events.forEach((event, index) => {
    if (event.success || event.timestampMs === null) return;

    if (!byUser.has(event.user)) {
      byUser.set(event.user, []);
    }

    byUser.get(event.user).push({ index, ts: event.timestampMs });
  });

  byUser.forEach((entries) => {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);

    for (let i = 0; i < sorted.length; i++) {
      const windowEntries = sorted.filter(
        (entry) =>
          entry.ts >= sorted[i].ts && entry.ts <= sorted[i].ts + windowMs,
      );

      if (windowEntries.length >= options.bruteForceThreshold) {
        windowEntries.forEach((entry) => {
          addHit(
            hitsByEvent,
            entry.index,
            "bruteForce",
            WEIGHTS.bruteForce,
            `${windowEntries.length} failed attempts within ${options.bruteForceWindowMinutes} minutes`,
          );
        });
      }
    }
  });
}

function detectPasswordSpray(events, hitsByEvent, options) {
  const windowMs = options.passwordSprayWindowMinutes * 60_000;
  const byIp = new Map();

  events.forEach((event, index) => {
    if (event.success || event.timestampMs === null || !event.ip) return;

    if (!byIp.has(event.ip)) {
      byIp.set(event.ip, []);
    }

    byIp.get(event.ip).push({ index, ts: event.timestampMs, user: event.user });
  });

  byIp.forEach((entries) => {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);

    for (let i = 0; i < sorted.length; i++) {
      const windowEntries = sorted.filter(
        (entry) =>
          entry.ts >= sorted[i].ts && entry.ts <= sorted[i].ts + windowMs,
      );

      const distinctUsers = new Set(windowEntries.map((entry) => entry.user));

      if (distinctUsers.size >= options.passwordSprayDistinctUsers) {
        windowEntries.forEach((entry) => {
          addHit(
            hitsByEvent,
            entry.index,
            "passwordSpray",
            WEIGHTS.passwordSpray,
            `${distinctUsers.size} different users from this IP within ${options.passwordSprayWindowMinutes} minutes`,
          );
        });
      }
    }
  });
}

function detectUnusualCountry(events, hitsByEvent, options) {
  let baseline;

  if (options.expectedCountries?.length) {
    baseline = new Set(
      options.expectedCountries
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    );
  } else {
    const counts = new Map();

    events.forEach((event) => {
      if (!event.country) return;
      const key = event.country.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    baseline = new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([country]) => country),
    );
  }

  events.forEach((event, index) => {
    if (!event.country) return;
    if (baseline.has(event.country.toLowerCase())) return;

    addHit(
      hitsByEvent,
      index,
      "unusualCountry",
      WEIGHTS.unusualCountry,
      `Country outside baseline: ${event.country}`,
    );
  });
}

function detectOutsideBusinessHours(events, hitsByEvent, options) {
  const offsetMs = options.timezoneOffsetMinutes * 60_000;

  events.forEach((event, index) => {
    if (event.timestampMs === null) return;

    const local = new Date(event.timestampMs + offsetMs);
    const hour = local.getUTCHours();
    const day = local.getUTCDay();
    const isWeekend = day === 0 || day === 6;
    const isOutsideHours =
      hour < options.businessStartHour || hour >= options.businessEndHour;

    if (isWeekend || isOutsideHours) {
      addHit(
        hitsByEvent,
        index,
        "outsideBusinessHours",
        WEIGHTS.outsideBusinessHours,
        isWeekend
          ? "Weekend sign-in"
          : `Sign-in at ${String(hour).padStart(2, "0")}:00 local time`,
      );
    }
  });
}

function detectNewDevice(events, hitsByEvent) {
  const byUser = new Map();

  events.forEach((event, index) => {
    const combo = `${event.device}|${event.browser}`.trim();
    if (combo === "|") return;

    const key = event.user;

    if (!byUser.has(key)) {
      byUser.set(key, new Map());
    }

    const combos = byUser.get(key);

    if (!combos.has(combo)) {
      combos.set(combo, []);
    }

    combos.get(combo).push(index);
  });

  byUser.forEach((combos) => {
    combos.forEach((indices, combo) => {
      if (indices.length === 1) {
        const [device, browser] = combo.split("|");

        addHit(
          hitsByEvent,
          indices[0],
          "newDevice",
          WEIGHTS.newDevice,
          `Device/browser appears only once: ${device || "unknown device"} / ${browser || "unknown browser"}`,
        );
      }
    });
  });
}

function detectUnknownIp(events, hitsByEvent) {
  const ipUsers = new Map();
  const ipEvents = new Map();

  events.forEach((event, index) => {
    if (!event.ip) return;

    if (!ipUsers.has(event.ip)) ipUsers.set(event.ip, new Set());
    ipUsers.get(event.ip).add(event.user);

    if (!ipEvents.has(event.ip)) ipEvents.set(event.ip, []);
    ipEvents.get(event.ip).push(index);
  });

  ipUsers.forEach((users, ip) => {
    const indices = ipEvents.get(ip);

    if (users.size > 1) {
      indices.forEach((index) => {
        addHit(
          hitsByEvent,
          index,
          "unknownIp",
          WEIGHTS.unknownIp,
          `IP ${ip} shared by ${users.size} different users`,
        );
      });
    } else if (indices.length === 1 && !events[indices[0]].success) {
      addHit(
        hitsByEvent,
        indices[0],
        "unknownIp",
        WEIGHTS.unknownIp,
        `IP ${ip} appears once, on a failed attempt`,
      );
    }
  });
}

function detectImpossibleTravel(events, hitsByEvent, options) {
  const windowMs = options.impossibleTravelWindowHours * 60 * 60_000;
  const byUser = new Map();

  events.forEach((event, index) => {
    if (event.timestampMs === null || !event.country) return;

    if (!byUser.has(event.user)) byUser.set(event.user, []);
    byUser
      .get(event.user)
      .push({ index, ts: event.timestampMs, country: event.country });
  });

  byUser.forEach((entries) => {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (curr.country.toLowerCase() === prev.country.toLowerCase()) continue;

      if (curr.ts - prev.ts <= windowMs) {
        const note = `Country changed from ${prev.country} to ${curr.country} within ${Math.round((curr.ts - prev.ts) / 60_000)} minutes`;
        addHit(
          hitsByEvent,
          prev.index,
          "impossibleTravel",
          WEIGHTS.impossibleTravel,
          note,
        );
        addHit(
          hitsByEvent,
          curr.index,
          "impossibleTravel",
          WEIGHTS.impossibleTravel,
          note,
        );
      }
    }
  });
}

function detectConcurrentLocations(events, hitsByEvent, options) {
  const windowMs = options.concurrentWindowMinutes * 60_000;
  const byUser = new Map();

  events.forEach((event, index) => {
    if (event.timestampMs === null || !event.success) return;

    if (!byUser.has(event.user)) byUser.set(event.user, []);
    byUser.get(event.user).push({
      index,
      ts: event.timestampMs,
      country: event.country,
      ip: event.ip,
    });
  });

  byUser.forEach((entries) => {
    const sorted = [...entries].sort((a, b) => a.ts - b.ts);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const differs =
        (curr.country && prev.country && curr.country !== prev.country) ||
        curr.ip !== prev.ip;

      if (differs && curr.ts - prev.ts <= windowMs) {
        const note = `Two successful sign-ins within ${options.concurrentWindowMinutes} minutes from different locations`;
        addHit(
          hitsByEvent,
          prev.index,
          "concurrentLocations",
          WEIGHTS.concurrentLocations,
          note,
        );
        addHit(
          hitsByEvent,
          curr.index,
          "concurrentLocations",
          WEIGHTS.concurrentLocations,
          note,
        );
      }
    }
  });
}

function levelForEventScore(score) {
  if (score < 15) return "Low";
  if (score < 35) return "Average";
  if (score < 60) return "High";
  return "Critical";
}

function levelForOverallScore(score) {
  if (score < 25) return "Low";
  if (score < 50) return "Average";
  if (score < 75) return "High";
  return "Critical";
}

export function levelToStatus(level) {
  if (level === "Low") return "success";
  if (level === "Average") return "warning";
  if (level === "High") return "warning";
  return "error";
}

function recommendedAction(anomalyTypes) {
  const present = new Set(anomalyTypes);

  for (const [type, action] of ACTION_PRIORITY) {
    if (present.has(type)) return action;
  }

  return "No action needed.";
}

function buildManagementSummary({
  overallScore,
  overallLevel,
  userSummaries,
  groupedAnomalies,
  eventCount,
}) {
  if (groupedAnomalies.length === 0) {
    return `No anomalies were found in the ${eventCount} sign-ins analysed. Risk level: ${overallLevel}.`;
  }

  const worstUsers = userSummaries
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const lines = [
    `Risk level: ${overallLevel} (score ${overallScore}/100). ${groupedAnomalies.length} type(s) of anomaly found across ${eventCount} sign-ins.`,
  ];

  worstUsers.forEach((user) => {
    const types = Array.from(user.anomalyTypes)
      .map((type) => ANOMALY_TYPES[type]?.label || type)
      .join(", ");

    lines.push(
      `${user.user}: risk level ${user.level} — ${types || "no specific anomaly"}.`,
    );
  });

  lines.push(
    `Recommended next step: ${recommendedAction(worstUsers[0]?.anomalyTypes || [])}`,
  );

  return lines.join("\n");
}

function buildTechnicalSummary({
  groupedAnomalies,
  eventCount,
  userSummaries,
}) {
  const lines = [
    `${eventCount} events analysed, ${userSummaries.length} unique users.`,
    ...groupedAnomalies.map(
      (group) =>
        `${group.label}: ${group.eventCount} event(s) across ${group.userCount} user(s).`,
    ),
  ];

  return lines.join("\n");
}

export function analyzeSignInLog(rawText, userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  if (!rawText || !rawText.trim()) {
    return { success: false, error: "No data to analyse." };
  }

  let inputType;
  let events;
  let detectedColumns;

  try {
    ({ inputType, events, detectedColumns } = detectInputAndParse(rawText));
  } catch (error) {
    return { success: false, error: `Parse error: ${error.message}` };
  }

  if (!events || events.length === 0) {
    return {
      success: false,
      error:
        "No usable sign-in events found. Check the format (JSON, CSV or a pasted table).",
    };
  }

  events.sort((a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0));

  const hitsByEvent = new Map();

  detectLegacyAuth(events, hitsByEvent);
  detectFailedLogins(events, hitsByEvent, options);
  detectBruteForce(events, hitsByEvent, options);
  detectPasswordSpray(events, hitsByEvent, options);
  detectUnusualCountry(events, hitsByEvent, options);
  detectOutsideBusinessHours(events, hitsByEvent, options);
  detectNewDevice(events, hitsByEvent);
  detectUnknownIp(events, hitsByEvent);
  detectImpossibleTravel(events, hitsByEvent, options);
  detectConcurrentLocations(events, hitsByEvent, options);

  const groupedByType = new Map();

  const timeline = events.map((event, index) => {
    const hits = hitsByEvent.get(index) || [];
    const score = Math.min(
      100,
      hits.reduce((sum, hit) => sum + hit.weight, 0),
    );
    const anomalyTypes = Array.from(
      new Set(hits.map((hit) => hit.type)),
    ).filter((type) => type !== "failedLoginBase");

    anomalyTypes.forEach((type) => {
      if (!groupedByType.has(type)) {
        groupedByType.set(type, { events: new Set(), users: new Set() });
      }
      groupedByType.get(type).events.add(index);
      groupedByType.get(type).users.add(event.user);
    });

    return {
      user: event.user,
      timestampRaw: event.timestampRaw,
      timestampMs: event.timestampMs,
      ip: event.ip,
      country: event.country,
      city: event.city,
      device: event.device,
      os: event.os,
      browser: event.browser,
      clientApp: event.clientApp,
      success: event.success,
      riskScore: score,
      riskLevel: levelForEventScore(score),
      anomalyTypes,
      notes: hits.map((hit) => hit.note),
      recommendedAction: recommendedAction(anomalyTypes),
    };
  });

  const userSummaryMap = timeline.reduce((map, event) => {
    if (!map.has(event.user)) {
      map.set(event.user, {
        user: event.user,
        score: 0,
        anomalyTypes: new Set(),
        eventCount: 0,
      });
    }

    const entry = map.get(event.user);
    entry.eventCount += 1;
    entry.score = Math.max(entry.score, event.riskScore);
    event.anomalyTypes.forEach((type) => entry.anomalyTypes.add(type));

    return map;
  }, new Map());

  const userSummaryList = Array.from(userSummaryMap.values()).map((entry) => ({
    ...entry,
    level: levelForEventScore(entry.score),
  }));

  const groupedAnomalies = Array.from(groupedByType.entries())
    .map(([type, data]) => ({
      type,
      label: ANOMALY_TYPES[type]?.label || type,
      description: ANOMALY_TYPES[type]?.description || "",
      severity: ANOMALY_TYPES[type]?.severity || "neutral",
      eventCount: data.events.size,
      userCount: data.users.size,
    }))
    .sort((a, b) => {
      const priorityA = ACTION_PRIORITY.findIndex(([t]) => t === a.type);
      const priorityB = ACTION_PRIORITY.findIndex(([t]) => t === b.type);
      return priorityA - priorityB;
    });

  const distinctAnomalyTypes = groupedAnomalies.length;
  const usersWithCriticalEvent = userSummaryList.filter(
    (u) => u.level === "Critical",
  ).length;
  const highestUserScore = userSummaryList.reduce(
    (max, u) => Math.max(max, u.score),
    0,
  );

  const overallScore = Math.min(
    100,
    highestUserScore + distinctAnomalyTypes * 5 + usersWithCriticalEvent * 10,
  );

  const overallLevel = levelForOverallScore(overallScore);

  const result = {
    success: true,
    inputType,
    detectedColumns,
    eventCount: events.length,
    userCount: userSummaryList.length,
    timeRange: {
      start: events.find((e) => e.timestampMs !== null)?.timestampMs ?? null,
      end:
        [...events].reverse().find((e) => e.timestampMs !== null)
          ?.timestampMs ?? null,
    },
    overallScore,
    overallLevel,
    timeline,
    userSummaries: userSummaryList.sort((a, b) => b.score - a.score),
    groupedAnomalies,
  };

  result.managementSummary = buildManagementSummary({
    overallScore,
    overallLevel,
    userSummaries: result.userSummaries,
    groupedAnomalies,
    eventCount: result.eventCount,
  });

  result.technicalSummary = buildTechnicalSummary({
    groupedAnomalies,
    eventCount: result.eventCount,
    userSummaries: result.userSummaries,
  });

  return result;
}

export async function runSignInAnomalyTool(tool, inputValues) {
  return inputValues.result || { success: false, error: "No data" };
}
