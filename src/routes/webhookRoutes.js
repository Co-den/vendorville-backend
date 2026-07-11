// #routes/webhookRoutes.js
import { paystackWebhook } from "#controllers/webhookController.js";
import express from "express";

const router = express.Router();
router.post("/paystack", paystackWebhook);

export default router;
