import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses } from "#models/business.js";
import { orderItems, orders } from "#models/order.js";
import { products } from "#models/product.js";
import { and, desc, eq } from "drizzle-orm";

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

const generateOrderNumber = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VH-${Date.now().toString().slice(-6)}${rand}`;
};

export const getOrders = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);

  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.businessId, businessId))
    .orderBy(desc(orders.createdAt));

  const withItems = await Promise.all(
    list.map(async (order) => {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      return {
        ...order,
        totalAmount: order.totalAmount / 100,
        items: items.map((i) => ({ ...i, unitPrice: i.unitPrice / 100 })),
      };
    }),
  );

  return withItems;
};

export const createOrder = async (userId, businessId, data) => {
  await assertBusinessOwnership(userId, businessId);

  const {
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    notes,
    items,
  } = data;

  if (!items || items.length === 0) {
    throw new Error("Order must include at least one item");
  }

  // Validate stock and compute total server-side — never trust a client-submitted total
  let totalAmount = 0;
  const resolvedItems = [];

  for (const item of items) {
    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);
    if (
      productResult.length === 0 ||
      productResult[0].businessId !== businessId
    ) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    const product = productResult[0];

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}" — only ${product.stock} left`,
      );
    }

    const lineTotal = product.price * item.quantity;
    totalAmount += lineTotal;

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  const orderNumber = generateOrderNumber();

  const result = await db.transaction(async (tx) => {
    const [newOrder] = await tx
      .insert(orders)
      .values({
        businessId,
        orderNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        totalAmount,
        paymentMethod: paymentMethod || "cash",
        status: "pending",
        notes: notes || null,
      })
      .returning();

    await tx
      .insert(orderItems)
      .values(resolvedItems.map((item) => ({ ...item, orderId: newOrder.id })));

    // Decrement stock for each product sold
    for (const item of resolvedItems) {
      const productResult = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      await tx
        .update(products)
        .set({
          stock: productResult[0].stock - item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));
    }

    return newOrder;
  });

  logger.info(`Order ${orderNumber} created for business ${businessId}`);

  return {
    ...result,
    totalAmount: result.totalAmount / 100,
    items: resolvedItems.map((i) => ({ ...i, unitPrice: i.unitPrice / 100 })),
  };
};

export const updateOrderStatus = async (
  userId,
  businessId,
  orderId,
  status,
) => {
  await assertBusinessOwnership(userId, businessId);

  const validStatuses = ["pending", "paid", "fulfilled", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid order status");
  }

  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (orderResult.length === 0 || orderResult[0].businessId !== businessId) {
    throw new Error("Order not found");
  }

  // If cancelling a previously-active order, restock the items
  if (status === "cancelled" && orderResult[0].status !== "cancelled") {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    await db.transaction(async (tx) => {
      for (const item of items) {
        if (!item.productId) continue;
        const productResult = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        if (productResult.length > 0) {
          await tx
            .update(products)
            .set({
              stock: productResult[0].stock + item.quantity,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId));
        }
      }
      await tx
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });
  } else {
    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }

  logger.info(`Order ${orderId} status updated to ${status}`);
  return { message: "Order status updated" };
};

export const deleteOrder = async (userId, businessId, orderId) => {
  await assertBusinessOwnership(userId, businessId);
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
  await db
    .delete(orders)
    .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)));
};
