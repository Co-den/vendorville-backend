import * as storefrontController from "#controllers/storefrontController.js";
import { customerAuth } from "#middlewares/customerAuth.js";
import { softCustomerAuth } from "#middlewares/softCustomerAuth.js";
import {
  authLimiter,
  orderLimiter,
  registerLimiter,
  reviewLimiter,
} from "#src/middlewares/rateLimiters.js";
import express from "express";

const router = express.Router();

router.get("/directory", storefrontController.getDirectory);

router.get("/:slug", storefrontController.getStorefront);
router.post(
  "/:slug/orders",
  softCustomerAuth,
  orderLimiter,
  storefrontController.createOrder,
);
router.post(
  "/:slug/verify-payment",
  storefrontController.verifyPaystackPayment,
);
//router.post("/customer/register", storefrontController.registerCustomer);
//router.post("/customer/login", storefrontController.loginCustomer);

router.get("/:slug/reviews", storefrontController.getPublicReviews);
router.post("/:slug/reviews", reviewLimiter, storefrontController.submitReview);

router.post(
  "/customer/register",
  registerLimiter,
  storefrontController.registerCustomer,
);
router.post("/customer/login", authLimiter, storefrontController.loginCustomer);
router.post("/customer/logout", storefrontController.logoutCustomer);
router.get(
  "/customer/check-auth",
  softCustomerAuth,
  storefrontController.checkCustomerAuth,
);
router.get(
  "/customer/orders",
  customerAuth,
  storefrontController.getCustomerOrders,
);
export default router;
