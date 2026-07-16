import * as storefrontController from "#controllers/storefrontController.js";
import { softCustomerAuth } from "#middlewares/softCustomerAuth.js";
import express from "express";

const router = express.Router();

router.get("/:slug", storefrontController.getStorefront);
router.post(
  "/:slug/orders",
  softCustomerAuth,
  storefrontController.createOrder,
);
router.post(
  "/:slug/verify-payment",
  storefrontController.verifyPaystackPayment,
);
router.post("/customer/register", storefrontController.registerCustomer);
router.post("/customer/login", storefrontController.loginCustomer);

export default router;
