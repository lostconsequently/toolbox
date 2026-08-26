const { isBlockedTarget } = require("./networkSecurity");

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_REDIRECTS = 3;
// Generous for any JSON/text response this app actually consumes (WHOIS/IP
// geolocation/vendor lookups are all small payloads), small enough to bound
// memory use if a slow or misbehaving external host sends something huge.
const DEFAULT_MAX_BODY_BYTES = 3 * 1024 * 1024;

class ExternalApiError extends Error {
  constructor(message, { status, statusText, url } = {}) {
    super(message);
    this.name = "ExternalApiError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * Fetches with a timeout and its own redirect handling - every redirect hop
 * is validated against the same private/internal-address blocklist used for
 * direct connections, so an external API we call (e.g. a WHOIS bootstrap
 * service that 3xx's to the registry's own RDAP server) can't be abused to
 * redirect this server into fetching an internal/metadata URL. Callers that
 * really want the raw fetch redirect behaviour can still pass their own
 * `redirect` option - it's overridden here on purpose.
 */
async function fetchApi(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    ...fetchOptions
  } = options;

  let currentUrl = url;

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount += 1
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;

    try {
      response = await fetch(currentUrl, {
        ...fetchOptions,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ExternalApiError(
          "The external API is not responding (timeout).",
          {
            url: currentUrl,
          },
        );
      }

      throw new ExternalApiError(`External API unreachable: ${error.message}`, {
        url: currentUrl,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");

    if (!isRedirect || !location) {
      return response;
    }

    let nextUrl;

    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      // Malformed Location header - hand the raw redirect response back
      // rather than guessing.
      return response;
    }

    if (isBlockedTarget(nextUrl.hostname)) {
      throw new ExternalApiError("Redirect to a disallowed address refused.", {
        url: nextUrl.toString(),
      });
    }

    currentUrl = nextUrl.toString();
  }

  throw new ExternalApiError("Too many redirects.", { url: currentUrl });
}

async function readBodyWithLimit(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    // No streamable body available (e.g. a test double) - fall back to a
    // plain read, still enforcing the limit after the fact.
    const text = await response.text();

    if (text.length > maxBytes) {
      throw new ExternalApiError("External API response is too large.", {
        url: response.url,
      });
    }

    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    received += value.byteLength;

    if (received > maxBytes) {
      await reader.cancel();

      throw new ExternalApiError("External API response is too large.", {
        url: response.url,
      });
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return text;
}

async function fetchApiJson(url, options = {}) {
  const { maxBytes = DEFAULT_MAX_BODY_BYTES, ...rest } = options;

  const response = await fetchApi(url, rest);

  if (!response.ok) {
    throw new ExternalApiError(
      `External API returned error ${response.status}`,
      {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      },
    );
  }

  const text = await readBodyWithLimit(response, maxBytes);

  return JSON.parse(text);
}

async function fetchApiText(url, options = {}) {
  const { maxBytes = DEFAULT_MAX_BODY_BYTES, ...rest } = options;

  const response = await fetchApi(url, rest);

  if (!response.ok) {
    throw new ExternalApiError(
      `External API returned error ${response.status}`,
      {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      },
    );
  }

  return readBodyWithLimit(response, maxBytes);
}

module.exports = {
  fetchApi,
  fetchApiJson,
  fetchApiText,
  readBodyWithLimit,
  ExternalApiError,
};
