//import { paystackWebhook } from "#controllers/webhookController.js";
import {flutterwaveWebhook} from "#controllers/flutterWebhookController.js"
import express from "express";

const router = express.Router();
//router.post("/paystack", paystackWebhook);
router.post("/flutterwave", flutterwaveWebhook);

export default router;
