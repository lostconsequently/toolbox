const { spawn } = require("node:child_process");

const IS_WINDOWS = process.platform === "win32";

const MAX_DURATION_MS = 3 * 60 * 1000;

function buildArgs({ address, maxHops, timeoutMs, resolveHostnames }) {
  const args = [];

  if (IS_WINDOWS) {
    args.push("-h", String(maxHops), "-w", String(timeoutMs));

    if (!resolveHostnames) {
      args.push("-d");
    }
  } else {
    args.push(
      "-m",
      String(maxHops),
      "-q",
      "3",
      "-w",
      String(Math.max(1, Math.round(timeoutMs / 1000))),
    );

    if (!resolveHostnames) {
      args.push("-n");
    }
  }

  args.push(address);

  return args;
}

// Handles both "1 ms 1 ms 1 ms 192.168.1.1" and mixed/timeout variants like
// "5 ms * 6 ms 8.8.8.1". Times are returned in encounter order; a null entry
// means that particular probe timed out.
function parseWindowsHopLine(line) {
  const hopMatch = line.match(/^\s*(\d+)\s+(.*)$/);

  if (!hopMatch) return null;

  const hopNumber = Number(hopMatch[1]);
  const rest = hopMatch[2].trim();

  if (/^Request timed out\.?$/i.test(rest) || /^\*\s+\*\s+\*\s*$/.test(rest)) {
    return { hopNumber, times: [null, null, null], host: null };
  }

  const tokenMatch = rest.match(
    /^(\*|<?\d+\s*ms)\s+(\*|<?\d+\s*ms)\s+(\*|<?\d+\s*ms)\s+(.*)$/i,
  );

  if (!tokenMatch) return null;

  const times = [tokenMatch[1], tokenMatch[2], tokenMatch[3]].map((token) =>
    token === "*" ? null : Number(token.replace(/<|ms/gi, "").trim()),
  );

  const host = tokenMatch[4].trim() || null;

  return { hopNumber, times, host };
}

function parseUnixHopLine(line) {
  const hopMatch = line.match(/^\s*(\d+)\s+(.*)$/);

  if (!hopMatch) return null;

  const hopNumber = Number(hopMatch[1]);
  const rest = hopMatch[2].trim();

  if (/^\*(\s+\*){2}\s*$/.test(rest)) {
    return { hopNumber, times: [null, null, null], host: null };
  }

  const hostMatch = rest.match(/^([^\s]+)/);
  const host = hostMatch ? hostMatch[1].replace(/[()]/g, "") : null;

  const times = [];
  const timeRegex = /(\d+\.?\d*)\s*ms/g;
  let match = timeRegex.exec(rest);

  while (match && times.length < 3) {
    times.push(Math.round(Number(match[1])));
    match = timeRegex.exec(rest);
  }

  while (times.length < 3) {
    times.push(null);
  }

  return { hopNumber, times, host };
}

function isTargetHop(host, address) {
  if (!host) return false;

  return (
    host === address || host.includes(`[${address}]`) || host.includes(address)
  );
}

/**
 * Mirrors pingRunner's approach: spawn the OS trace tool, normalize every
 * hop line into the same shape regardless of platform, emit structured
 * events - never raw stdout - so the frontend can render consistent
 * Windows-style output no matter what the backend runs on.
 */
function runTraceroute(
  { address, maxHops, timeoutMs, resolveHostnames },
  onEvent,
) {
  const args = buildArgs({ address, maxHops, timeoutMs, resolveHostnames });

  const child = spawn(IS_WINDOWS ? "tracert" : "traceroute", args, {
    windowsHide: true,
  });

  let buffer = "";
  let spawnError = null;
  let hopCount = 0;
  let reachedTarget = false;

  const safetyTimer = setTimeout(() => {
    child.kill();
  }, MAX_DURATION_MS);

  function handleLine(line) {
    if (!line.trim()) return;

    const parsed = IS_WINDOWS
      ? parseWindowsHopLine(line)
      : parseUnixHopLine(line);

    if (!parsed) return;

    hopCount = Math.max(hopCount, parsed.hopNumber);

    if (isTargetHop(parsed.host, address)) {
      reachedTarget = true;
    }

    onEvent({
      type: "hop",
      hopNumber: parsed.hopNumber,
      host: parsed.host,
      times: parsed.times,
    });
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
    clearTimeout(safetyTimer);

    if (spawnError) {
      onEvent({
        type: "error",
        message:
          spawnError.code === "ENOENT"
            ? "The traceroute command is not available on the server."
            : "Traceroute could not be started.",
      });
      onEvent({ type: "done" });
      return;
    }

    onEvent({
      type: "summary",
      totalHops: hopCount,
      reachedTarget,
    });

    onEvent({ type: "done" });
  });

  return {
    kill: () => {
      clearTimeout(safetyTimer);
      child.kill();
    },
  };
}

module.exports = { runTraceroute, IS_WINDOWS };
