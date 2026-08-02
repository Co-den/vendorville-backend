import * as walletController from "#controllers/walletController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
//import securityMiddleware from "#middlewares/security.js";
import { paymentLimiter } from "#src/middlewares/rateLimiters.js";
import express from "express";

const router = express.Router();

router.use(authMiddleware);

//router.use(securityMiddleware);

router.get("/", walletController.getWallet);
router.post(
  "/generate-account",
  paymentLimiter,
  walletController.generateAccount,
);
router.get("/transactions", walletController.getTransactions);
router.get("/bank-accounts", walletController.getBankAccounts);
router.post("/bank-accounts", paymentLimiter, walletController.addBankAccount);
router.delete("/bank-accounts/:id", walletController.removeBankAccount);
router.post("/withdraw", paymentLimiter, walletController.withdraw);
router.get("/banks", walletController.getBanks);
router.post(
  "/resolve-account",
  paymentLimiter,
  walletController.resolveAccount,
);

export default router;
