import * as subscriptionController from "#controllers/subscriptionController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import express from "express";

const router = express.Router();
router.use(authMiddleware);

router.get("/", subscriptionController.getSubscription);
router.post("/upgrade", subscriptionController.upgradeSubscription);

export default router;
