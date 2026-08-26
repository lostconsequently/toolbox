const express = require("express");

const router = express.Router();

const { resolveAndValidateTarget } = require("../utils/networkSecurity");
const { createRateLimiter } = require("../utils/rateLimiter");
const { runTraceroute } = require("../utils/tracerouteRunner");

const traceStreamLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 15 });

const MAX_HOPS_OPTIONS = new Set([10, 20, 30, 64]);
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 10000;

function parseBool(value) {
  return String(value).toLowerCase() === "true";
}

router.get("/stream", traceStreamLimiter, async (req, res) => {
  const host = String(req.query.host || "").trim();

  const maxHopsRaw = Number(req.query.maxHops);
  const maxHops = MAX_HOPS_OPTIONS.has(maxHopsRaw) ? maxHopsRaw : 30;

  const timeoutMs = Math.min(
    MAX_TIMEOUT_MS,
    Math.max(MIN_TIMEOUT_MS, Number(req.query.timeout) || 4000),
  );

  const resolveHostnames = parseBool(req.query.dnsLookup);

  // Same reasoning as the ping route: always respond as an event stream,
  // even for validation failures, since EventSource can't read the body of
  // a non-2xx response.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let responseEnded = false;

  const send = (event) => {
    if (responseEnded) return;

    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (event.type === "done") {
      responseEnded = true;
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

  // Anything below this point (including runTraceroute itself, which spawns
  // and wires up a child process) must never throw/reject uncaught - the
  // response is already committed as an event stream, so an unhandled
  // rejection here would crash the whole Node process instead of just
  // failing this one request.
  try {
    send({
      type: "start",
      host,
      resolvedIp: target.address,
      maxHops,
    });

    const traceProcess = runTraceroute(
      {
        address: target.address,
        maxHops,
        timeoutMs,
        resolveHostnames,
      },
      send,
    );

    req.on("close", () => {
      if (responseEnded) return;

      responseEnded = true;
      traceProcess.kill();
    });
  } catch (error) {
    send({
      type: "error",
      message: error?.message || "Traceroute failed unexpectedly.",
    });
    send({ type: "done" });
  }
});

module.exports = router;
