import { jwtSign } from "#utils/jwt.js";

export const softCustomerAuth = (req, res, next) => {
  const token = req.cookies?.customer_token;
  if (!token) {
    req.customer = null;
    return next();
  }
  try {
    req.customer = jwtSign.verify(token);
  } catch {
    req.customer = null;
  }
  next();
};
