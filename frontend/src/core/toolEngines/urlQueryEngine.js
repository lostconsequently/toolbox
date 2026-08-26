export function parseUrlQuery(input = "") {
  const trimmed = String(input).trim();

  if (!trimmed) {
    return {
      type: "urlQueryParser",
      status: "neutral",
      error: null,
      params: [],
      base: null,
    };
  }

  let urlObject = null;
  let queryString = trimmed;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    try {
      urlObject = new URL(trimmed);
      queryString = urlObject.search;
    } catch {
      return {
        type: "urlQueryParser",
        status: "error",
        error: "Invalid URL. Check the protocol, host and path.",
        params: [],
        base: null,
      };
    }
  }

  let searchParams;

  try {
    searchParams = new URLSearchParams(
      queryString.startsWith("?") ? queryString.slice(1) : queryString,
    );
  } catch {
    return {
      type: "urlQueryParser",
      status: "error",
      error: "Invalid query string.",
      params: [],
      base: null,
    };
  }

  const grouped = new Map();

  for (const [key, value] of searchParams.entries()) {
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(value);
  }

  const params = Array.from(grouped.entries()).map(([key, values]) => ({
    key,
    values,
    value: values.join(", "),
  }));

  return {
    type: "urlQueryParser",
    status: params.length ? "success" : "warning",
    error: params.length ? null : "No query parameters found.",
    params,
    base: urlObject
      ? {
          protocol: urlObject.protocol.replace(":", ""),
          host: urlObject.host,
          pathname: urlObject.pathname,
          hash: urlObject.hash || null,
        }
      : null,
  };
}
