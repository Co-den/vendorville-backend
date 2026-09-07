// services/transactionService.js
import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { transactions } from "#models/transaction.js";
import { businesses } from "#models/business.js";
import { and, eq } from "drizzle-orm";

const assertBusinessOwnership = async (userId, businessId) => {
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (business.length === 0 || business[0].userId !== userId) {
    throw new Error("Business not found or not yours");
  }

  return business[0];
};

export const createTransaction = async (
  userId,
  businessId,
  {
    type,
    amount,
    status = "pending",
    paymentMethod,
    paystackReference,
    paystackAuthCode,
    bankTransferReference,
    bankAccount,
    bankCode,
    bankName,
    recipientName,
    orderId,
    description,
    reference,
    metadata,
  },
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!type || !amount || amount <= 0) {
    throw new Error("Invalid transaction data");
  }

  try {
    const [transaction] = await db
      .insert(transactions)
      .values({
        businessId,
        userId,
        type,
        amount,
        status,
        paymentMethod,
        paystackReference,
        paystackAuthCode,
        bankTransferReference,
        bankAccount,
        bankCode,
        bankName,
        recipientName,
        orderId,
        description,
        reference,
        metadata,
      })
      .returning();

    logger.info(
      `Transaction ${transaction.id} created for business ${businessId}`,
    );

    return transaction;
  } catch (error) {
    logger.error("Error creating transaction:", error);
    throw error;
  }
};

export const getTransactions = async (userId, businessId, filters = {}) => {
  await assertBusinessOwnership(userId, businessId);

  try {
    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.businessId, businessId));

    if (filters.type) {
      query = query.where(eq(transactions.type, filters.type));
    }

    if (filters.status) {
      query = query.where(eq(transactions.status, filters.status));
    }

    if (filters.paymentMethod) {
      query = query.where(
        eq(transactions.paymentMethod, filters.paymentMethod),
      );
    }

    const txnList = await query.orderBy(transactions.createdAt);

    logger.info(
      `Fetched ${txnList.length} transactions for business ${businessId}`,
    );

    return txnList;
  } catch (error) {
    logger.error("Error fetching transactions:", error);
    throw error;
  }
};

export const getTransactionById = async (userId, businessId, transactionId) => {
  await assertBusinessOwnership(userId, businessId);

  try {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.businessId, businessId),
        ),
      )
      .limit(1);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return transaction;
  } catch (error) {
    logger.error("Error fetching transaction:", error);
    throw error;
  }
};

export const updateTransactionStatus = async (
  userId,
  businessId,
  transactionId,
  status,
) => {
  await assertBusinessOwnership(userId, businessId);

  const validStatuses = ["pending", "completed", "failed", "reversed"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  try {
    const [updated] = await db
      .update(transactions)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.businessId, businessId),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Transaction not found");
    }

    logger.info(`Transaction ${transactionId} status updated to ${status}`);

    return updated;
  } catch (error) {
    logger.error("Error updating transaction status:", error);
    throw error;
  }
};

export const getTransactionSummary = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);

  try {
    const txnList = await db
      .select()
      .from(transactions)
      .where(eq(transactions.businessId, businessId));

    const summary = {
      totalTransactions: txnList.length,
      totalIncome: txnList
        .filter(
          (t) =>
            (t.type === "sale" || t.type === "deposit") &&
            t.status === "completed",
        )
        .reduce((sum, t) => sum + t.amount, 0),
      totalRefunds: txnList
        .filter((t) => t.type === "refund" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: txnList
        .filter((t) => t.type === "withdrawal" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      pendingTransactions: txnList.filter((t) => t.status === "pending").length,
      byType: {
        sales: txnList.filter((t) => t.type === "sale").length,
        refunds: txnList.filter((t) => t.type === "refund").length,
        withdrawals: txnList.filter((t) => t.type === "withdrawal").length,
        deposits: txnList.filter((t) => t.type === "deposit").length,
      },
    };

    return summary;
  } catch (error) {
    logger.error("Error calculating transaction summary:", error);
    throw error;
  }
};
