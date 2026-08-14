import * as pushController from "#controllers/pushController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import express from "express";

const router = express.Router();

router.get("/vapid-public-key", pushController.getVapidPublicKey);
router.post("/subscribe", authMiddleware, pushController.subscribe);
router.post("/unsubscribe", authMiddleware, pushController.unsubscribe);

export default router;
