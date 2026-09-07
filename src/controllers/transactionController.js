import * as transactionService from "#services/transactionService.js";

export const createTransaction = async (req, res) => {
  try {
    const businessId = req.params.id;
    const transaction = await transactionService.createTransaction(
      req.user.id,
      businessId,
      req.body,
    );

    res.status(201).json({ transaction });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const businessId = req.params.id;
    const { type, status, paymentMethod } = req.query;

    const transactions = await transactionService.getTransactions(
      req.user.id,
      businessId,
      { type, status, paymentMethod },
    );

    res.status(200).json({ transactions });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id, transactionId } = req.params;

    const transaction = await transactionService.getTransactionById(
      req.user.id,
      id,
      transactionId,
    );

    res.status(200).json({ transaction });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTransactionStatus = async (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const { status } = req.body;

    const transaction = await transactionService.updateTransactionStatus(
      req.user.id,
      id,
      transactionId,
      status,
    );

    res.status(200).json({ transaction });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionSummary = async (req, res) => {
  try {
    const businessId = req.params.id;

    const summary = await transactionService.getTransactionSummary(
      req.user.id,
      businessId,
    );

    res.status(200).json({ summary });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
