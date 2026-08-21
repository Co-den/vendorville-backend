import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { getIo } from "#config/socket.js";
import { businesses } from "#models/business.js";
import { orders } from "#models/order.js";
import { orderDispatch, riders } from "#models/rider.js";
import { notifyOrderEvent } from "#services/notificationService.js";
import { getSubscription } from "#services/subscriptionService.js";
import { kudismsApi } from "#utils/kudisms.js";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";

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

const assertDispatchAccess = async (userId) => {
  const sub = await getSubscription(userId);
  if (sub.plan !== "starter" && sub.plan !== "enterprise") {
    throw new Error("Dispatch rider management requires the Enterprise plan.");
  }
};

export const getRiders = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);
  return db.select().from(riders).where(eq(riders.businessId, businessId));
};

export const addRider = async (userId, businessId, { name, phone }) => {
  await assertDispatchAccess(userId);
  await assertBusinessOwnership(userId, businessId);

  if (!name || !phone) throw new Error("Rider name and phone are required");

  const [rider] = await db
    .insert(riders)
    .values({ businessId, name, phone })
    .returning();
  return rider;
};

export const removeRider = async (userId, businessId, riderId) => {
  await assertBusinessOwnership(userId, businessId);
  await db
    .delete(riders)
    .where(and(eq(riders.id, riderId), eq(riders.businessId, businessId)));
};

export const toggleRiderActive = async (
  userId,
  businessId,
  riderId,
  isActive,
) => {
  await assertBusinessOwnership(userId, businessId);
  const [updated] = await db
    .update(riders)
    .set({ isActive })
    .where(and(eq(riders.id, riderId), eq(riders.businessId, businessId)))
    .returning();
  return updated;
};

export const assignRiderToOrder = async (
  userId,
  businessId,
  orderId,
  riderId,
) => {
  await assertDispatchAccess(userId);
  await assertBusinessOwnership(userId, businessId);

  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, Number(orderId)))
    .limit(1);
  if (
    orderResult.length === 0 ||
    orderResult[0].businessId !== Number(businessId)
  ) {
    throw new Error("Order not found");
  }
  const order = orderResult[0];

  const riderResult = await db
    .select()
    .from(riders)
    .where(eq(riders.id, Number(riderId)))
    .limit(1);
  if (
    riderResult.length === 0 ||
    riderResult[0].businessId !== Number(businessId)
  ) {
    throw new Error("Rider not found");
  }
  const rider = riderResult[0];
  if (!rider.isActive) throw new Error("This rider is currently inactive");

  const trackingToken = crypto.randomBytes(16).toString("hex");

  const existing = await db
    .select()
    .from(orderDispatch)
    .where(eq(orderDispatch.orderId, orderId))
    .limit(1);

  let dispatch;
  if (existing.length === 0) {
    [dispatch] = await db
      .insert(orderDispatch)
      .values({ orderId, riderId, status: "assigned", trackingToken })
      .returning();
  } else {
    [dispatch] = await db
      .update(orderDispatch)
      .set({
        riderId,
        status: "assigned",
        trackingToken,
        assignedAt: new Date(),
        pickedUpAt: null,
        deliveredAt: null,
        currentLat: null,
        currentLng: null,
      })
      .where(eq(orderDispatch.orderId, orderId))
      .returning();
  }

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  const business = bizResult[0];

  // SMS the rider with pickup/delivery details + their unique tracking link
  const riderLink = `${process.env.FRONTEND_URL}/rider/track/${trackingToken}`;
  const riderMessage =
    `New delivery: Pick up order ${order.orderNumber} from ` +
    `${business.name} (${business.address}). ` +
    `Deliver to: ${order.deliveryAddress}. ` +
    `Start sharing your location: ${riderLink}`;

  const senderID = business.smsSenderId || "VendorVille";

  kudismsApi
    .sendSms(rider.phone, riderMessage, rider.name, senderID)
    .catch((err) => logger.error("Rider SMS error", err));

  notifyOrderEvent({
    event: "order_dispatched",
    order: { ...order, totalAmount: order.totalAmount / 100 },
    business,
  }).catch((err) => logger.error("Dispatch notification error", err));

  return { ...dispatch, riderName: rider.name, riderPhone: rider.phone };
};

export const getDispatchByToken = async (token) => {
  const result = await db
    .select()
    .from(orderDispatch)
    .where(eq(orderDispatch.trackingToken, token))
    .limit(1);
  if (result.length === 0) throw new Error("Invalid tracking link");
  const dispatch = result[0];

  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.id, dispatch.orderId))
    .limit(1);
  const order = orderResult[0];

  const riderResult = await db
    .select()
    .from(riders)
    .where(eq(riders.id, dispatch.riderId))
    .limit(1);
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, order.businessId))
    .limit(1);

  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    pickupAddress: bizResult[0]?.address,
    pickupBusinessName: bizResult[0]?.name,
    riderName: riderResult[0]?.name,
    status: dispatch.status,
  };
};

export const updateRiderLocation = async (token, lat, lng) => {
  const result = await db
    .select()
    .from(orderDispatch)
    .where(eq(orderDispatch.trackingToken, token))
    .limit(1);
  if (result.length === 0) throw new Error("Invalid tracking link");
  const dispatch = result[0];

  await db
    .update(orderDispatch)
    .set({
      currentLat: String(lat),
      currentLng: String(lng),
      locationUpdatedAt: new Date(),
    })
    .where(eq(orderDispatch.id, dispatch.id));

  const io = getIo();
  if (io) {
    io.to(`order_${dispatch.orderId}`).emit("rider_location", {
      lat,
      lng,
      updatedAt: new Date(),
    });
  }

  return { message: "Location updated" };
};

export const updateDispatchStatus = async (
  userId,
  businessId,
  orderId,
  status,
) => {
  await assertBusinessOwnership(userId, businessId);

  const validStatuses = ["assigned", "picked_up", "delivered", "failed"];
  if (!validStatuses.includes(status))
    throw new Error("Invalid dispatch status");

  const dispatchResult = await db
    .select()
    .from(orderDispatch)
    .where(eq(orderDispatch.orderId, orderId))
    .limit(1);
  if (dispatchResult.length === 0)
    throw new Error("This order has no rider assigned");

  const updateData = { status };
  if (status === "picked_up") updateData.pickedUpAt = new Date();
  if (status === "delivered") updateData.deliveredAt = new Date();

  const [updated] = await db
    .update(orderDispatch)
    .set(updateData)
    .where(eq(orderDispatch.orderId, orderId))
    .returning();

  if (status === "delivered") {
    await db
      .update(orders)
      .set({ status: "fulfilled", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }

  return updated;
};

export const getOrderDispatch = async (businessId, orderId) => {
  const result = await db
    .select({
      status: orderDispatch.status,
      assignedAt: orderDispatch.assignedAt,
      pickedUpAt: orderDispatch.pickedUpAt,
      deliveredAt: orderDispatch.deliveredAt,
      riderName: riders.name,
      riderPhone: riders.phone,
      currentLat: orderDispatch.currentLat,
      currentLng: orderDispatch.currentLng,
    })
    .from(orderDispatch)
    .innerJoin(riders, eq(orderDispatch.riderId, riders.id))
    .where(eq(orderDispatch.orderId, orderId))
    .limit(1);

  return result[0] || null;
};
