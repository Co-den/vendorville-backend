import * as orderController from "#controllers/orderController.js";
import { dashboardWriteLimiter } from "#src/middlewares/rateLimiters.js";
//import authMiddleware from "#middlewares/authMiddleware.js";
import {
  flexibleAuth,
  restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js";
//import securityMiddleware from "#middlewares/security.js";
import express from "express";

const router = express.Router({ mergeParams: true });
//router.use(authMiddleware);
router.use(flexibleAuth);
router.use(restrictToOwnBusiness);
//router.use(securityMiddleware);

router.get("/", orderController.getOrders);
router.post("/", dashboardWriteLimiter, orderController.createOrder);
router.patch(
  "/:orderId/status",
  dashboardWriteLimiter,
  orderController.updateOrderStatus,
);
router.delete("/:orderId", dashboardWriteLimiter, orderController.deleteOrder);
router.post(
  "/:orderId/confirm",
  dashboardWriteLimiter,
  orderController.confirmOrder,
);
router.get("/notifications", orderController.getNotifications);

export default router;
