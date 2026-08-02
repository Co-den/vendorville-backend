import * as staffController from "#controllers/staffController.js";
import { authLimiter } from "#middlewares/rateLimiters.js";
import express from "express";

const router = express.Router();

router.post("/login", authLimiter, staffController.loginStaff);

export default router;
