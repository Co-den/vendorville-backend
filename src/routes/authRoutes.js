import { login, logout, resendCode, signup, verifyEmail } from "#controllers/authController.js";
import express from "express";

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);
    
router.post("/verify-email", verifyEmail);

router.post("/resend-code", resendCode);

export default router;