import logger from "#config/logger.js";
import { jwtSign } from "#utils/jwt.js";

const authMiddleware = (req, res, next) => {
  try {
    let token;

    // Check for token in cookies first, then in Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      logger.warn("Missing authentication token", {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: "Unauthorized",
        message:
          "Authentication token is missing. Please provide a valid token.",
      });
    }

    const decoded = jwtSign.verify(token);
    if (decoded.type === "staff" || decoded.type === "customer") {
      return res.status(403).json({
        error: "Forbidden",
        message: "This action requires a vendor account.",
      });
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      timeZone: decoded.timeZone,
    };

    logger.debug("User authenticated", {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      timeZone: decoded.timeZone,
    });

    next();
  } catch (error) {
    logger.warn("Authentication failed", {
      ip: req.ip,
      path: req.path,
      error: error.message,
    });

    if (error.message.includes("jwt expired")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token has expired. Please login again.",
      });
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or malformed authentication token.",
    });
  }
};

export default authMiddleware;
