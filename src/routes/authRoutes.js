import {
  checkAuth,
  login,
  logout,
  resendCode,
  signup,
  verifyEmail,
} from "#controllers/authController.js";
import authMiddleware from "#src/middlewares/authMiddleware.js";
import express from "express";

const router = express.Router();

router.post("/signup", signup);

router.get("/check-auth", authMiddleware, checkAuth);

router.post("/login", login);

router.post("/logout", logout);

router.post("/verify-email", verifyEmail);

router.post("/resend-code", resendCode);

export default router;
