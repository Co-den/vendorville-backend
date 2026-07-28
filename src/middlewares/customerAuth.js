import { jwtSign } from "#utils/jwt.js";

export const customerAuth = (req, res, next) => {
  let token = req.cookies?.customer_token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: "Please log in to view this." });
  }

  try {
    req.customer = jwtSign.verify(token);
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again." });
  }
};
