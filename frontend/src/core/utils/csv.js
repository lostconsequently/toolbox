export function parseDelimited(text, delimiter = ",") {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  return tabCount > commaCount ? "\t" : ",";
}

export function parseCsv(text) {
  return parseDelimited(text, detectDelimiter(text));
}

export function normalizeHeader(header) {
  return header
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function matchHeaders(headers, rules) {
  const map = {};
  const detected = [];

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);

    for (const rule of rules) {
      if (map[rule.field] !== undefined) continue;

      const matches = rule.keywords.some(
        (keyword) => normalized === keyword || normalized.includes(keyword),
      );

      if (matches) {
        map[rule.field] = index;
        detected.push({ field: rule.field, label: rule.label, header });
        break;
      }
    }
  });

  return { map, detected };
}
