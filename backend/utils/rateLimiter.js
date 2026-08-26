const requestCounts = new Map();

const CLEANUP_INTERVAL = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();

  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetAt) {
      requestCounts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

function createRateLimiter({ windowMs = 60 * 1000, max = 30 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const current = requestCounts.get(key) || {
      count: 0,
      resetAt: now + windowMs,
    };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;

    requestCounts.set(key, current);

    if (current.count > max) {
      return res.status(429).json({
        error: "Too many requests. Try again later.",
      });
    }

    next();
  };
}

module.exports = { createRateLimiter };
