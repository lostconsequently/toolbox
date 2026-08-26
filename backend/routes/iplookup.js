const net = require("node:net");
const express = require("express");

const router = express.Router();

const { isBlockedTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");
const { fetchApiJson, ExternalApiError } = require("../utils/externalApi");

const iplookupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

router.get(
  "/:query",
  iplookupLimiter,
  asyncHandler(async (req, res) => {
    const query = String(req.params.query || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "No IP address provided",
        code: "ip.noAddress",
      });
    }

    // This is an IP lookup, not a domain resolver - reject anything that
    // isn't a literal IPv4/IPv6 address instead of silently forwarding
    // hostnames to the external API (which happens to accept them too).
    if (!net.isIP(query)) {
      return res.status(400).json({
        error: "Invalid IP address",
        code: "ip.invalidAddress",
      });
    }

    if (isBlockedTarget(query)) {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    let data;

    try {
      data = await fetchApiJson(
        `https://ipwho.is/${encodeURIComponent(query)}`,
      );
    } catch (error) {
      if (error instanceof ExternalApiError) {
        return res.status(error.status || 502).json({
          error: "IP lookup failed",
          code: "ip.lookupFailed",
        });
      }

      throw error;
    }

    if (data.success === false) {
      return res.status(404).json({
        error: data.message || "No IP information found",
      });
    }

    res.json({
      success: true,
      ip: data.ip || query,
      type: data.type || "Unknown",
      continent: data.continent || "Unknown",
      country: data.country || "Unknown",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      isp: data.connection?.isp || "Unknown",
      organization: data.connection?.org || "Unknown",
      asn: data.connection?.asn || "Unknown",
      domain: data.connection?.domain || "Unknown",
      timezone: data.timezone?.id || "Unknown",
    });
  }),
);

module.exports = router;
