const { spawn } = require("node:child_process");

const IS_WINDOWS = process.platform === "win32";

// Safety net for continuous ("-t" / no -c) pings: if a client's connection
// drops without the server ever seeing the close event (rare, but network
// blips happen), this guarantees the spawned ping process still dies instead
// of running forever in the background.
const MAX_CONTINUOUS_DURATION_MS = 5 * 60 * 1000;

function buildArgs({
  address,
  count,
  continuous,
  timeoutMs,
  size,
  ipv4,
  ipv6,
}) {
  const args = [];

  if (IS_WINDOWS) {
    if (continuous) {
      args.push("-t");
    } else {
      args.push("-n", String(count));
    }

    args.push("-w", String(timeoutMs));
    args.push("-l", String(size));

    if (ipv4) args.push("-4");
    if (ipv6) args.push("-6");
  } else {
    if (!continuous) {
      args.push("-c", String(count));
    }

    // iputils ping's -W is a whole-seconds per-reply timeout, unlike
    // Windows' millisecond -w.
    args.push("-W", String(Math.max(1, Math.round(timeoutMs / 1000))));
    args.push("-s", String(size));

    if (ipv4) args.push("-4");
    if (ipv6) args.push("-6");
  }

  args.push(address);

  return args;
}

// Covers the two most likely locales for this line (English and Dutch
// Windows installs both show up in MSP environments). A ping binary in a
// different locale will simply produce lines that don't match here - they
// still show up verbatim in the live output, they just won't count toward
// the statistics. See backlog: force English ping output regardless of
// system locale.
function parseWindowsLine(line) {
  const replyMatch = line.match(
    /^(?:Reply from|Antwoord van)\s+[^\s:]+:.*?(?:time|tijd)[=<](\d+)\s*ms.*?TTL=(\d+)/i,
  );

  if (replyMatch) {
    return {
      kind: "reply",
      timeMs: Number(replyMatch[1]),
      ttl: Number(replyMatch[2]),
    };
  }

  // Windows ping prints in the OS display language, so the timeout line has to
  // be matched in every locale we expect to run on, not just English.
  if (
    /Request timed out|Time-?out van deze bewerking|time-out bij deze opdracht/i.test(
      line,
    )
  ) {
    return { kind: "timeout" };
  }

  if (
    /could not find host|kon de host niet vinden|transmit failed|destination (?:host|net) unreachable|bestemmings(?:host|netwerk) onbereikbaar/i.test(
      line,
    )
  ) {
    return { kind: "unreachable" };
  }

  return null;
}

function parseUnixLine(line) {
  const replyMatch = line.match(
    /^\d+\s+bytes from\s+[^\s:]+:\s+icmp_seq=(\d+)\s+ttl=(\d+)\s+time=([\d.]+)\s*ms/i,
  );

  if (replyMatch) {
    return {
      kind: "reply",
      sequence: Number(replyMatch[1]),
      ttl: Number(replyMatch[2]),
      timeMs: Math.round(Number(replyMatch[3])),
    };
  }

  if (/Destination Host Unreachable|Destination Net Unreachable/i.test(line)) {
    return { kind: "unreachable" };
  }

  return null;
}

/**
 * Spawns the OS ping binary and normalizes every reply into the same shape
 * regardless of platform, so the frontend can render Windows-style output
 * (`Reply from X: bytes=Y time=Zms TTL=W`) even when the backend itself runs
 * on Linux/macOS. Emits structured events via `onEvent` - never raw stdout -
 * this is the single place that has to know about ping's platform quirks.
 *
 * Returns `{ kill }` so the caller can cancel a continuous ping (e.g. the
 * client clicked Stop, or disconnected).
 */
function runPing(
  { address, count, continuous, timeoutMs, size, ipv4, ipv6 },
  onEvent,
) {
  const args = buildArgs({
    address,
    count,
    continuous,
    timeoutMs,
    size,
    ipv4,
    ipv6,
  });

  const child = spawn("ping", args, { windowsHide: true });

  let sequence = 0;
  let expectedUnixSeq = null;
  let sent = 0;
  let received = 0;
  const samples = [];
  let buffer = "";
  let spawnError = null;
  let killedByCaller = false;
  let autoStoppedMaxDuration = false;

  const safetyTimer = continuous
    ? setTimeout(() => {
        killedByCaller = true;
        autoStoppedMaxDuration = true;
        child.kill();
      }, MAX_CONTINUOUS_DURATION_MS)
    : null;

  function emitReply({ timeMs, ttl }) {
    sequence += 1;
    sent += 1;
    received += 1;
    samples.push(timeMs);
    onEvent({ type: "reply", sequence, success: true, timeMs, ttl });
  }

  function emitTimeout() {
    sequence += 1;
    sent += 1;
    onEvent({ type: "reply", sequence, success: false });
  }

  function handleLine(line) {
    if (!line.trim()) return;

    if (IS_WINDOWS) {
      const parsed = parseWindowsLine(line);

      if (!parsed) return;

      if (parsed.kind === "reply") {
        emitReply(parsed);
      } else if (parsed.kind === "timeout" || parsed.kind === "unreachable") {
        emitTimeout();
      }

      return;
    }

    const parsed = parseUnixLine(line);

    if (!parsed) return;

    if (parsed.kind === "unreachable") {
      emitTimeout();
      return;
    }

    if (expectedUnixSeq === null) {
      expectedUnixSeq = parsed.sequence;
    }

    // A gap in icmp_seq means ping silently dropped a request - Unix ping
    // doesn't print anything for a lost packet, unlike Windows' explicit
    // "Request timed out." line, so we synthesize one per missing sequence.
    while (expectedUnixSeq < parsed.sequence) {
      emitTimeout();
      expectedUnixSeq += 1;
    }

    emitReply(parsed);
    expectedUnixSeq = parsed.sequence + 1;
  }

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");

    const lines = buffer.split(/\r?\n/);

    buffer = lines.pop() || "";

    lines.forEach(handleLine);
  });

  child.once("error", (error) => {
    spawnError = error;
  });

  child.once("close", () => {
    if (safetyTimer) clearTimeout(safetyTimer);

    if (spawnError) {
      onEvent({
        type: "error",
        message:
          spawnError.code === "ENOENT"
            ? "The ping command is not available on the server."
            : "Ping could not be started.",
      });
      onEvent({ type: "done" });
      return;
    }

    if (killedByCaller && sent === 0) {
      // Stopped before a single reply came in - nothing meaningful to
      // summarize, avoid a bogus "0 sent" statistics block.
      onEvent({ type: "done" });
      return;
    }

    if (autoStoppedMaxDuration) {
      onEvent({
        type: "autostopped",
        message: "Continuous ping stopped automatically after 5 minutes.",
      });
    }

    const lost = sent - received;
    const lossPercent = sent > 0 ? Math.round((lost / sent) * 100) : 0;

    const minMs = samples.length ? Math.min(...samples) : null;
    const maxMs = samples.length ? Math.max(...samples) : null;
    const avgMs = samples.length
      ? Math.round(
          samples.reduce((total, value) => total + value, 0) / samples.length,
        )
      : null;

    let jitterMs = null;

    if (samples.length > 1) {
      const diffs = [];

      for (let i = 1; i < samples.length; i += 1) {
        diffs.push(Math.abs(samples[i] - samples[i - 1]));
      }

      jitterMs =
        Math.round(
          (diffs.reduce((total, value) => total + value, 0) / diffs.length) *
            10,
        ) / 10;
    }

    onEvent({
      type: "summary",
      sent,
      received,
      lost,
      lossPercent,
      minMs,
      maxMs,
      avgMs,
      jitterMs,
    });

    onEvent({ type: "done" });
  });

  return {
    kill: () => {
      killedByCaller = true;

      if (safetyTimer) clearTimeout(safetyTimer);

      child.kill();
    },
  };
}

module.exports = { runPing, IS_WINDOWS };
