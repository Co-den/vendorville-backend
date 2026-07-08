import aj from "#config/arcjet.js";
import loggers from "#config/logger.js";
import { slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req, res, next) => {
  // Skip middleware during tests
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  try {
    const role = req.user?.role || "guest";

    let limit;
    let message;

    switch (role) {
      case "admin":
        limit = 20;
        message = "Admin request limited to 20 requests per minute. Slow down.";
        break;

      case "user":
        limit = 10;
        message = "User request limited to 10 requests per minute. Slow down.";
        break;

      default:
        limit = 5;
        message = "Guest request limited to 5 requests per minute. Slow down.";
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: "1m",
        max: limit,
        name: `${role}-rate-limit`,
      }),
    );

    const decision = await client.protect(req);

    // BOT BLOCKING
    if (decision.isDenied() && decision.reason.isBot()) {
      loggers.warn("Bot request blocked:", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Automated requests are not allowed.",
      });
    }

    // SHIELD BLOCK
    if (decision.isDenied() && decision.reason.isShield()) {
      loggers.warn("Shield request blocked:", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Request blocked by security policy.",
      });
    }

    // RATE LIMIT BLOCK
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      loggers.warn("Rate limit request blocked:", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });

      return res.status(429).json({
        error: "Too Many Requests",
        message,
      });
    }

    next();
  } catch (err) {
    console.error("Arcjet Middleware Error:", err);

    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred with security middleware.",
    });
  }
};

export default securityMiddleware;