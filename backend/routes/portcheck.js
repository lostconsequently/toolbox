const express = require("express");
const net = require("net");

const router = express.Router();

const { resolveAndValidateTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");

const portCheckLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

// Well-known ports whose services speak first (send a greeting banner
// immediately after the TCP handshake), so capturing it confirms the
// right service is actually listening - not just that something is.
const BANNER_PORTS = new Set([21, 25, 587]);
const BANNER_WAIT_MS = 2000;

function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const socket = new net.Socket();

    let completed = false;
    let bannerTimer = null;

    const finish = (result) => {
      if (completed) {
        return;
      }

      completed = true;

      if (bannerTimer) {
        clearTimeout(bannerTimer);
      }

      socket.destroy();

      resolve({
        ...result,
        latencyMs: Date.now() - startTime,
      });
    };

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      if (!BANNER_PORTS.has(port)) {
        finish({
          open: true,
          errorCode: null,
          banner: null,
        });
        return;
      }

      bannerTimer = setTimeout(() => {
        finish({
          open: true,
          errorCode: null,
          banner: null,
        });
      }, BANNER_WAIT_MS);

      socket.once("data", (chunk) => {
        const banner = chunk.toString("utf8").split(/\r?\n/)[0].slice(0, 200);

        finish({
          open: true,
          errorCode: null,
          banner,
        });
      });
    });

    socket.once("timeout", () => {
      finish({
        open: false,
        errorCode: "TIMEOUT",
        banner: null,
      });
    });

    socket.once("error", (error) => {
      finish({
        open: false,
        errorCode: error.code || "CONNECTION_ERROR",
        banner: null,
      });
    });

    socket.connect(port, host);
  });
}

router.get(
  "/",
  portCheckLimiter,
  asyncHandler(async (req, res) => {
    const host = String(req.query.host || "").trim();
    const rawPort = String(req.query.port || "").trim();

    if (!host) {
      return res.status(400).json({
        error: "No host or IP provided",
        code: "port.noHost",
      });
    }

    // Strict decimal check first - Number("0x50") === 80 would otherwise let
    // a hex-looking string silently pass as a completely different port.
    if (!/^\d{1,5}$/.test(rawPort)) {
      return res.status(400).json({
        error: "Invalid port. Use a port between 1 and 65535.",
        code: "port.invalidPort",
      });
    }

    const port = Number(rawPort);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return res.status(400).json({
        error: "Invalid port. Use a port between 1 and 65535.",
        code: "port.invalidPort",
      });
    }

    let target;

    try {
      target = await resolveAndValidateTarget(host);
    } catch {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    const result = await checkPort(target.address, port);

    res.json({
      success: true,
      host,
      port,
      open: result.open,
      latencyMs: result.latencyMs,
      errorCode: result.errorCode,
      banner: result.banner,
    });
  }),
);

module.exports = router;
