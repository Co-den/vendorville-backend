import { jwtSign } from "#utils/jwt.js";

export const adminAuth = (req, res, next) => {
  let token = req.cookies?.admin_token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return res.status(401).json({ message: "Admin login required." });

  try {
    const decoded = jwtSign.verify(token);
    if (decoded.type !== "admin")
      return res.status(401).json({ message: "Invalid session." });
    req.admin = decoded;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again." });
  }
};
