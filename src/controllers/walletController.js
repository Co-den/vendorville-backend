import logger from "#config/logger.js";
import * as walletService from "#services/walletService.js";

export const getWallet = async (req, res, next) => {
  try {
    const details = await walletService.getWalletDetails(req.user.id);
    res.status(200).json(details);
  } catch (error) {
    next(error);
  }
};

export const generateAccount = async (req, res, next) => {
  try {
    const result = await walletService.generateDedicatedAccount(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Generate account error", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to generate account" });
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await walletService.getTransactions(req.user.id);
    res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
};

export const getBankAccounts = async (req, res, next) => {
  try {
    const bankAccounts = await walletService.getBankAccounts(req.user.id);
    res.status(200).json({ bankAccounts });
  } catch (error) {
    next(error);
  }
};

export const addBankAccount = async (req, res, next) => {
  try {
    const { accountNumber, bankName } = req.body;
    if (!accountNumber || !bankName) {
      return res
        .status(400)
        .json({ message: "Bank name and account number are required" });
    }
    const account = await walletService.addBankAccount(
      req.user.id,
      accountNumber,
      bankName,
    );
    res.status(201).json({ account });
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message || "Failed to add bank account" });
  }
};

export const removeBankAccount = async (req, res, next) => {
  try {
    await walletService.removeBankAccount(req.user.id, req.params.id);
    res.status(200).json({ message: "Bank account removed" });
  } catch (error) {
    next(error);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    const { amount, bankAccountId } = req.body;
    if (!amount || !bankAccountId) {
      return res
        .status(400)
        .json({ message: "Amount and bank account are required" });
    }
    const result = await walletService.withdrawFromWallet(
      req.user.id,
      amount,
      bankAccountId,
    );
    res.status(200).json({ newBalance: result.newBalance });
  } catch (error) {
    res.status(400).json({ message: error.message || "Withdrawal failed" });
  }
};

export const getBanks = async (req, res) => {
  try {
    const banks = await walletService.getBanks();
    res.status(200).json({ banks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch banks" });
  }
};

export const resolveAccount = async (req, res) => {
  try {
    const { bankName, accountNumber } = req.body;
    if (!bankName || !accountNumber) {
      return res
        .status(400)
        .json({ message: "Bank name and account number are required" });
    }
    const result = await walletService.resolveAccountDetails(
      accountNumber,
      bankName,
    );
    res.status(200).json(result);
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message || "Could not resolve this account" });
  }
};
