import express from "express";
import * as analyticsController from "#controllers/analyticsController.js";
import {
    flexibleAuth,
    restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js"

const router = express.Router();
router.use(flexibleAuth);
router.use(restrictToOwnBusiness);

router.get(
  "/businesses/:id/orders",
  analyticsController.getOrdersByDateRange
);


router.get(
  "/businesses/:id/transactions",
  analyticsController.getTransactionsByDateRange
);


router.get(
  "/businesses/:id/orders/stats",
  analyticsController.getOrderStats
);


router.get(
  "/businesses/:id/transactions/stats",
  analyticsController.getTransactionStats
);


router.get(
  "/businesses/:id/stats",
  analyticsController.getStats
);

export default router;