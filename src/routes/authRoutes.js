import {
  changePassword,
  checkAuth,
  login,
  logout,
  resendCode,
  signup,
  verifyEmail,
} from "#controllers/authController.js";
import authMiddleware from "#src/middlewares/authMiddleware.js";
import {
  authLimiter,
  registerLimiter,
  resendCodeLimiter,
} from "#src/middlewares/rateLimiters.js";

import express from "express";

const router = express.Router();

router.post("/signup", registerLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-code", resendCodeLimiter, resendCode);
router.patch("/change-password", authMiddleware, changePassword);
router.get("/check-auth", authMiddleware, checkAuth);
router.post("/logout", logout);

export default router;
