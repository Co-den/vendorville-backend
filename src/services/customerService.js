import { db } from "#config/database.js";
import { businesses } from "#models/business.js";
import { customerAccount } from "#models/customerAccount.js";
import { orders } from "#models/order.js";
import { desc, eq, sql } from "drizzle-orm";

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

// Customers are derived from order history, enriched with any saved notes
export const getCustomers = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);

  const orderStats = await db
    .select({
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerEmail: orders.customerEmail,
      orderCount: sql`count(*)`.as("order_count"),
      totalSpent: sql`sum(${orders.totalAmount})`.as("total_spent"),
      lastOrderAt: sql`max(${orders.createdAt})`.as("last_order_at"),
    })
    .from(orders)
    .where(eq(orders.businessId, businessId))
    .groupBy(orders.customerName, orders.customerPhone, orders.customerEmail)
    .orderBy(desc(sql`max(${orders.createdAt})`));

  const savedNotes = await db
    .select()
    .from(customerAccount)
    .where(eq(customerAccount.businessId, businessId));
  const notesByPhone = Object.fromEntries(
    savedNotes.map((c) => [c.phone, c.notes]),
  );

  return orderStats.map((c) => ({
    name: c.customerName,
    phone: c.customerPhone,
    email: c.customerEmail,
    orderCount: Number(c.orderCount),
    totalSpent: Number(c.totalSpent) / 100,
    lastOrderAt: c.lastOrderAt,
    notes: c.customerPhone ? notesByPhone[c.customerPhone] || null : null,
  }));
};

export const saveCustomerNote = async (
  userId,
  businessId,
  phone,
  name,
  notes,
) => {
  await assertBusinessOwnership(userId, businessId);

  const existing = await db
    .select()
    .from(customerAccount)
    .where(eq(customerAccount.businessId, businessId))
    .then((rows) => rows.find((r) => r.phone === phone));

  if (existing) {
    await db
      .update(customerAccount)
      .set({ notes })
      .where(eq(customerAccount.id, existing.id));
  } else {
    await db.insert(customerAccount).values({ businessId, name, phone, notes });
  }

  return { message: "Note saved" };
};
