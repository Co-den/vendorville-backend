import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { orders } from "#models/order.js";
import { transactions } from "#models/transaction.js";
import { businesses } from "#models/business.js";
import { and, eq, gte, lte } from "drizzle-orm";

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

// Helper to parse dates safely
const parseDateSafely = (dateStr) => {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return date;
};


export const getOrdersByDateRange = async (
  userId,
  businessId,
  startDate,
  endDate
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  try {
    const start = parseDateSafely(startDate);
    const end = parseDateSafely(endDate);

    
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new Error("Start date must be before end date");
    }

    // DEBUG LOGS
    console.log("=== getOrdersByDateRange DEBUG ===");
    console.log("Business ID:", businessId);
    console.log("Start Date:", start.toISOString());
    console.log("End Date:", end.toISOString());

    logger.info(
      `Fetching orders for business ${businessId} between ${start.toISOString()} and ${end.toISOString()}`
    );

    const orderList = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        )
      )
      .orderBy(orders.createdAt);

    console.log("Orders found:", orderList.length);
    console.log("Sample order dates:", orderList.slice(0, 3).map(o => o.createdAt));

    logger.info(
      `Fetched ${orderList.length} orders for business ${businessId}`
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
  endDate
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  try {
    const start = parseDateSafely(startDate);
    const end = parseDateSafely(endDate);

    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new Error("Start date must be before end date");
    }

    logger.info(
      `Fetching transactions for business ${businessId} between ${start.toISOString()} and ${end.toISOString()}`
    );

    const transactionList = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          gte(transactions.createdAt, start),
          lte(transactions.createdAt, end)
        )
      )
      .orderBy(transactions.createdAt);

    logger.info(
      `Fetched ${transactionList.length} transactions for business ${businessId}`
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
  endDate
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  try {
    const start = parseDateSafely(startDate);
    const end = parseDateSafely(endDate);

    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new Error("Start date must be before end date");
    }

    const orderList = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        )
      );

    const totalUnitsSold = orderList.reduce((sum, order) => {
      if (order.items && Array.isArray(order.items)) {
        return (
          sum +
          order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0)
        );
      }
      return sum;
    }, 0);

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
      totalUnitsSold,
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
  endDate
) => {
  await assertBusinessOwnership(userId, businessId);

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  try {
    const start = parseDateSafely(startDate);
    const end = parseDateSafely(endDate);

    end.setHours(23, 59, 59, 999);

    if (start > end) {
      throw new Error("Start date must be before end date");
    }

    const transactionList = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          gte(transactions.createdAt, start),
          lte(transactions.createdAt, end)
        )
      );

    const stats = {
      totalTransactions: transactionList.length,
      totalIncome: transactionList
        .filter(
          (t) =>
            (t.type === "sale" || t.type === "deposit") &&
            t.status === "completed"
        )
        .reduce((sum, t) => sum + t.amount, 0),
      totalRefunds: transactionList
        .filter((t) => t.type === "refund" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: transactionList
        .filter((t) => t.type === "withdrawal" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
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
  endDate
) => {
  const orderStats = await getOrderStatsByDateRange(
    userId,
    businessId,
    startDate,
    endDate
  );

  const transactionStats = await getTransactionStatsByDateRange(
    userId,
    businessId,
    startDate,
    endDate
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