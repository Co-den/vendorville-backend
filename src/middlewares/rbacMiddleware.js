import logger from "#config/logger.js";

const rbacMiddleware = (requiredRoles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated (authMiddleware should run first)
      if (!req.user) {
        logger.warn("User not found in request", {
          ip: req.ip,
          path: req.path,
        });
        return res.status(401).json({
          error: "Unauthorized",
          message: "User information is missing. Please authenticate first.",
        });
      }

      const userRole = req.user.role;

      // Check if user's role is in the list of required roles
      if (!requiredRoles.includes(userRole)) {
        logger.warn("Authorization failed - insufficient permissions", {
          userId: req.user.id,
          email: req.user.email,
          userRole,
          requiredRoles,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `This action requires one of the following roles: ${requiredRoles.join(", ")}. You have role: ${userRole}`,
        });
      }

      logger.debug("Authorization granted", {
        userId: req.user.id,
        userRole,
        path: req.path,
      });

      next();
    } catch (error) {
      logger.error("RBAC middleware error", {
        error: error.message,
        path: req.path,
      });

      res.status(500).json({
        error: "Internal Server Error",
        message: "An error occurred during authorization check.",
      });
    }
  };
};

export default rbacMiddleware;