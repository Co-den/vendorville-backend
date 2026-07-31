import { jwtSign } from "#utils/jwt.js";

export const flexibleAuth = (req, res, next) => {
  let token = req.cookies?.token || req.cookies?.staff_token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = jwtSign.verify(token);

    if (decoded.type === "staff") {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: "staff",
        accessLevel: decoded.staffRole,
        businessId: decoded.businessId,
      };
    } else {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        accessLevel: "owner",
        firstName: decoded.firstName,
        timeZone: decoded.timeZone,
      };
    }

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
};

// Blocks staff entirely owner-only routes (wallet, subscription, staff management itself)
export const ownerOnly = (req, res, next) => {
  if (req.user.accessLevel !== "owner") {
    return res
      .status(403)
      .json({ message: "This action requires the business owner." });
  }
  next();
};

// Allows owner + manager, blocks plain staff
export const managerOrOwner = (req, res, next) => {
  if (req.user.accessLevel !== "owner" && req.user.accessLevel !== "manager") {
    return res
      .status(403)
      .json({ message: "This action requires manager access." });
  }
  next();
};

// Confirms a staff member is only accessing their own assigned business
export const restrictToOwnBusiness = (req, res, next) => {
  if (
    req.user.role === "staff" &&
    String(req.user.businessId) !==
      String(req.params.id || req.params.businessId)
  ) {
    return res
      .status(403)
      .json({ message: "You don't have access to this business." });
  }
  next();
};
