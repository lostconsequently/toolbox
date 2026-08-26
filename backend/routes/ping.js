const express = require("express");
const dns = require("node:dns").promises;

const router = express.Router();

const { resolveAndValidateTarget } = require("../utils/networkSecurity");
const { createRateLimiter } = require("../utils/rateLimiter");
const { runPing } = require("../utils/pingRunner");

// Streams stay open (continuous ping), so this limits new connections, not
// requests-per-connection - still enough to stop someone from spamming the
// server with ping child processes.
const pingStreamLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

// The rate limiter above only slows down how fast new streams can be
// opened - it does nothing to cap how many stay open at once, and a
// continuous ping can hold a live OS process for up to 5 minutes. Track
// concurrently-open streams separately so a burst of continuous pings can't
// pile up dozens of ping child processes on the server.
const MAX_CONCURRENT_STREAMS_GLOBAL = 50;
const MAX_CONCURRENT_STREAMS_PER_IP = 5;
let activeStreamsGlobal = 0;
const activeStreamsByIp = new Map();

function reserveStreamSlot(clientIp) {
  const currentForIp = activeStreamsByIp.get(clientIp) || 0;

  if (
    activeStreamsGlobal >= MAX_CONCURRENT_STREAMS_GLOBAL ||
    currentForIp >= MAX_CONCURRENT_STREAMS_PER_IP
  ) {
    return null;
  }

  activeStreamsGlobal += 1;
  activeStreamsByIp.set(clientIp, currentForIp + 1);

  let released = false;

  return () => {
    if (released) return;

    released = true;
    activeStreamsGlobal = Math.max(0, activeStreamsGlobal - 1);

    const remaining = (activeStreamsByIp.get(clientIp) || 1) - 1;

    if (remaining <= 0) {
      activeStreamsByIp.delete(clientIp);
    } else {
      activeStreamsByIp.set(clientIp, remaining);
    }
  };
}

const COUNT_OPTIONS = new Set([1, 4, 10, 20]);
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 10000;
const MIN_SIZE = 1;
const MAX_SIZE = 65500;

function parseBool(value) {
  return String(value).toLowerCase() === "true";
}

router.get("/stream", pingStreamLimiter, async (req, res) => {
  const host = String(req.query.host || "").trim();

  const countRaw = Number(req.query.count);
  const count = COUNT_OPTIONS.has(countRaw) ? countRaw : 4;
  const continuous =
    parseBool(req.query.continuous) || String(req.query.count) === "unlimited";

  const timeoutMs = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Number(req.query.timeout) || 4000),
  );

  const size = Math.min(
    MAX_SIZE,
    Math.max(MIN_SIZE, Number(req.query.size) || 32),
  );

  const dnsLookup = parseBool(req.query.dnsLookup);

  let ipv4 = parseBool(req.query.ipv4);
  let ipv6 = parseBool(req.query.ipv6);

  if (ipv4 && ipv6) {
    // Can't force both at once - IPv4 wins if the client somehow sent both.
    ipv6 = false;
  }

  // From here on we always respond as an event stream, even for validation
  // failures - EventSource on the browser side cannot read the body or
  // status of a non-2xx response, so a plain res.status(...).json(...)
  // error would silently show up as an opaque "connection failed" with no
  // message at all. Emitting a normal "error" event instead lets the
  // frontend show the real reason.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let responseEnded = false;
  let releaseStreamSlot = null;

  const send = (event) => {
    if (responseEnded) return;

    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (event.type === "done") {
      responseEnded = true;
      releaseStreamSlot?.();
      res.end();
    }
  };

  if (!host) {
    send({ type: "error", message: "No host or IP provided." });
    send({ type: "done" });
    return;
  }

  let target;

  try {
    target = await resolveAndValidateTarget(host);
  } catch (error) {
    send({
      type: "error",
      message: error.message || "This address is not allowed.",
    });
    send({ type: "done" });
    return;
  }

  const clientIp = req.ip || req.connection?.remoteAddress || "unknown";
  releaseStreamSlot = reserveStreamSlot(clientIp);

  if (!releaseStreamSlot) {
    send({
      type: "error",
      message: "Too many active ping sessions at once. Try again shortly.",
    });
    send({ type: "done" });
    return;
  }

  let reverseHostname = null;

  if (dnsLookup) {
    try {
      const names = await dns.reverse(target.address);

      reverseHostname = names[0] || null;
    } catch {
      reverseHostname = null;
    }
  }

  // Anything below this point (including runPing itself, which spawns and
  // wires up a child process) must never throw/reject uncaught - the
  // response is already committed as an event stream, so an unhandled
  // rejection here would crash the whole Node process instead of just
  // failing this one request.
  try {
    send({
      type: "start",
      host,
      resolvedIp: target.address,
      reverseHostname,
      packetSize: size,
      continuous,
    });

    const pingProcess = runPing(
      {
        address: target.address,
        count,
        continuous,
        timeoutMs,
        size,
        ipv4,
        ipv6,
      },
      send,
    );

    req.on("close", () => {
      releaseStreamSlot?.();

      if (responseEnded) return;

      responseEnded = true;
      pingProcess.kill();
    });
  } catch (error) {
    releaseStreamSlot?.();
    send({
      type: "error",
      message: error?.message || "Ping failed unexpectedly.",
    });
    send({ type: "done" });
  }
});

module.exports = router;
