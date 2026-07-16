import * as subscriptionController from "#controllers/subscriptionController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import securityMiddleware from "#middlewares/security.js";
import express from "express";

const router = express.Router();
router.use(authMiddleware);
router.use(securityMiddleware);

router.get("/subscription", subscriptionController.getSubscription);
router.post(
  "/subscription/upgrade",
  subscriptionController.upgradeSubscription,
);

export default router;
