import express from "express";
import * as transactionController from "#controllers/transactionController.js";
import {
    flexibleAuth,
    restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js"

const router = express.Router();
router.use(flexibleAuth);
router.use(restrictToOwnBusiness);

router.post(
  "/businesses/:id/transactions",
  transactionController.createTransaction,
);
router.get(
  "/businesses/:id/transactions",
  transactionController.getTransactions,
);
router.get(
  "/businesses/:id/transactions/:transactionId",
  transactionController.getTransactionById,
);
router.patch(
  "/businesses/:id/transactions/:transactionId",
  transactionController.updateTransactionStatus,
);
router.get(
  "/businesses/:id/transactions/summary",
  transactionController.getTransactionSummary,
);

export default router;
