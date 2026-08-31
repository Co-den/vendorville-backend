import * as subscriptionController from "#controllers/subscriptionController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import { paymentLimiter } from "#src/middlewares/rateLimiters.js";
//import securityMiddleware from "#middlewares/security.js";
import express from "express";

const router = express.Router();
router.use(authMiddleware);
//router.use(securityMiddleware);

router.get("/", subscriptionController.getSubscription);
router.post(
  "/subscription/upgrade",
  paymentLimiter,
  subscriptionController.upgradeSubscription,
);

export default router;
