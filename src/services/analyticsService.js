import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { orders } from "#models/order.js";
import { businesses } from "#models/business.js";
import { transactions } from "#models/transaction.js";
import { and, between, eq } from "drizzle-orm";

const assertBusinessOwnership = async (userId, businessId) => {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Business not found or not yours");
  }
  return result[0];
};

export const getOrdersByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error("Start date must be before end date");
  }

  try {
    const orderList = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          between(orders.createdAt, start, end),
        ),
      )
      .orderBy(orders.createdAt);

    logger.info(
      `Fetched ${orderList.length} orders for business ${businessId} between ${startDate} and ${endDate}`,
    );

    return orderList;
  } catch (error) {
    logger.error("Error fetching orders by date range:", error);
    throw error;
  }
};

export const getTransactionsByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error("Start date must be before end date");
  }

  try {
    const transactionList = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          between(transactions.createdAt, start, end),
        ),
      )
      .orderBy(transactions.createdAt);

    logger.info(
      `Fetched ${transactionList.length} transactions for business ${businessId} between ${startDate} and ${endDate}`,
    );

    return transactionList;
  } catch (error) {
    logger.error("Error fetching transactions by date range:", error);
    throw error;
  }
};

export const getOrderStatsByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error("Start date must be before end date");
  }

  try {
    const orderList = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          between(orders.createdAt, start, end),
        ),
      );

    const stats = {
      totalOrders: orderList.length,
      completedOrders: orderList.filter((o) => o.status === "completed").length,
      cancelledOrders: orderList.filter((o) => o.status === "cancelled").length,
      pendingOrders: orderList.filter((o) => o.status === "pending").length,
      totalRevenue: orderList.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      averageOrderValue:
        orderList.length > 0
          ? orderList.reduce((sum, o) => sum + (o.totalAmount || 0), 0) /
            orderList.length
          : 0,
    };

    logger.info(`Calculated order stats for business ${businessId}`);

    return stats;
  } catch (error) {
    logger.error("Error calculating order stats:", error);
    throw error;
  }
};

export const getTransactionStatsByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error("Start date must be before end date");
  }

  try {
    const transactionList = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          between(transactions.createdAt, start, end),
        ),
      );

    const stats = {
      totalTransactions: transactionList.length,
      totalIncome: transactionList
        .filter((t) => t.type === "sale" || t.type === "deposit")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      totalRefunds: transactionList
        .filter((t) => t.type === "refund")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      totalWithdrawals: transactionList
        .filter((t) => t.type === "withdrawal")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      pendingTransactions: transactionList.filter((t) => t.status === "pending")
        .length,
    };

    logger.info(`Calculated transaction stats for business ${businessId}`);

    return stats;
  } catch (error) {
    logger.error("Error calculating transaction stats:", error);
    throw error;
  }
};

export const getStatsByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  const orderStats = await getOrderStatsByDateRange(
    userId,
    businessId,
    startDate,
    endDate,
  );

  const transactionStats = await getTransactionStatsByDateRange(
    userId,
    businessId,
    startDate,
    endDate,
  );

  return {
    orders: orderStats,
    transactions: transactionStats,
    period: {
      startDate,
      endDate,
    },
  };
};
