import { db } from "#config/database.js";
import { businesses } from "#models/business.js";
import { orders } from "#models/order.js";
import { and, desc, eq, gte, lte } from "drizzle-orm";

const assertBusinessOwnership = async (userId, businessId) => {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Business not found or not yours");
  }
};

export const generateOrdersCsv = async (
  userId,
  businessId,
  startDate,
  endDate,
) => {
  await assertBusinessOwnership(userId, businessId);

  let conditions = [eq(orders.businessId, businessId)];
  if (startDate) conditions.push(gte(orders.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(orders.createdAt, new Date(endDate)));

  const list = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));

  const header =
    "Order Number,Customer,Phone,Total (NGN),Payment Method,Status,Source,Date\n";
  const rows = list
    .map((o) =>
      [
        o.orderNumber,
        `"${o.customerName}"`,
        o.customerPhone || "",
        (o.totalAmount / 100).toFixed(2),
        o.paymentMethod,
        o.status,
        o.source,
        new Date(o.createdAt).toLocaleDateString("en-NG"),
      ].join(","),
    )
    .join("\n");

  return header + rows;
};
