import * as orderController from "#controllers/orderController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import securityMiddleware from "#middlewares/security.js";
import express from "express";

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);
router.use(securityMiddleware);

router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);
router.patch("/:orderId/status", orderController.updateOrderStatus);
router.delete("/:orderId", orderController.deleteOrder);

export default router;
