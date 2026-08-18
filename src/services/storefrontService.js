import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses, businessImages } from "#models/business.js";
import { customerAccounts } from "#models/customerAccount.js";
import { orderItems, orders } from "#models/order.js";
import { products } from "#models/product.js";
import { subscriptions } from "#models/subscription.js";
import { users } from "#models/user.js";
import { getZones, resolveZoneFee } from "#services/deliveryZoneService.js";
import { notifyOrderEvent } from "#services/notificationService.js";
import { checkAndNotifyLowStock } from "#services/productService.js";
import { getReviewStats } from "#services/reviewService.js";
import bcrypt from "bcrypt";
import { and, desc, eq } from "drizzle-orm";

const dayAbbrev = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getStorefront = async (slug) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (
    bizResult.length === 0 ||
    bizResult[0].visibility !== "public" ||
    bizResult[0].verificationStatus !== "approved"
  ) {
    throw new Error("Store not found");
  }

  const biz = bizResult[0];

  const productList = await db
    .select()
    .from(products)
    .where(eq(products.businessId, biz.id));
  const images = await db
    .select()
    .from(businessImages)
    .where(eq(businessImages.businessId, biz.id));

  const today = dayAbbrev[new Date().getDay()];
  const isOpenToday = biz.isAvailable && biz.availableDays.includes(today);
  const zones = await getZones(biz.id);

  return {
    business: {
      id: biz.id,
      name: biz.name,
      shortName: biz.shortName,
      logoUrl: biz.logoUrl,
      description: biz.description,
      whatsappNumber: biz.whatsappNumber,
      businessEmail: biz.businessEmail,
      instagram: biz.instagram,
      tiktok: biz.tiktok,
      address: biz.address,
      premisesImages: images.map((i) => i.imageUrl),
      isAvailable: biz.isAvailable,
      availableDays: biz.availableDays,
      isOpenToday,
    },
    products: productList
      .filter((p) => p.stock > 0)
      .map((p) => ({ ...p, price: p.price / 100 })),
    deliveryZones: zones,
  };
};

const generateOrderNumber = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VH-${Date.now().toString().slice(-6)}${rand}`;
};

export const createGuestOrder = async (
  slug,
  data,
  customerAccountId = null,
) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Store not found");
  const business = bizResult[0];

  const {
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    deliveryZoneId,
    paymentMethod,
    items,
  } = data;

  if (!items || items.length === 0)
    throw new Error("Order must include at least one item");
  if (!customerName || !customerPhone)
    throw new Error("Name and phone are required");
  if (!deliveryAddress) throw new Error("Delivery address is required");

  const { deliveryZoneId: resolvedZoneId, feeKobo: deliveryFee } =
    await resolveZoneFee(business.id, deliveryZoneId);

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
      productResult[0].businessId !== business.id
    ) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    const product = productResult[0];
    if (product.stock < item.quantity) {
      throw new Error(
        `"${product.name}" only has ${product.stock} left in stock`,
      );
    }
    totalAmount += product.price * item.quantity;
    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  const orderNumber = generateOrderNumber();
  const paystackReference = `store_${orderNumber}`;

  const newOrder = await db.transaction(async (tx) => {
    const [createdOrder] = await tx
      .insert(orders)
      .values({
        businessId: business.id,
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        customerAccountId,
        totalAmount: totalAmount + deliveryFee,
        deliveryAddress,
        deliveryFee,
        deliveryZoneId: resolvedZoneId,
        paymentMethod,
        status: "pending",
        source: "storefront",
        paystackReference,
      })
      .returning();

    await tx
      .insert(orderItems)
      .values(
        resolvedItems.map((item) => ({ ...item, orderId: createdOrder.id })),
      );

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

    return createdOrder;
  });

  const vendorResult = await db
    .select()
    .from(users)
    .where(eq(users.id, business.userId))
    .limit(1);
  notifyOrderEvent({
    event: "order_placed",
    order: {
      ...newOrder,
      totalAmount: newOrder.totalAmount / 100,
      deliveryFee: newOrder.deliveryFee / 100,
    },
    business,
    vendorPhone: vendorResult[0]?.phoneNumber,
  }).catch((err) => logger.error("Notification error", err));

  for (const item of resolvedItems) {
    checkAndNotifyLowStock(item.productId).catch((err) =>
      logger.error("Low stock check error", err),
    );
  }

  return {
    ...newOrder,
    totalAmount: newOrder.totalAmount / 100,
    deliveryFee: newOrder.deliveryFee / 100,
    items: resolvedItems.map((i) => ({ ...i, unitPrice: i.unitPrice / 100 })),
  };
};

export const markOrderPaidByReference = async (
  reference,
  verifiedAmountKobo,
) => {
  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.paystackReference, reference))
    .limit(1);
  if (orderResult.length === 0)
    throw new Error("Order not found for this reference");
  const order = orderResult[0];

  if (order.totalAmount !== verifiedAmountKobo) {
    throw new Error("Paid amount does not match order total");
  }

  await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, order.businessId))
    .limit(1);
  notifyOrderEvent({
    event: "order_paid",
    order: { ...order, totalAmount: order.totalAmount / 100 },
    business: bizResult[0],
  }).catch((err) => logger.error("Notification error", err));

  return { message: "Order marked as paid" };
};

// ===== Lightweight customer account (optional) =====

export const registerCustomer = async ({ name, email, phone, password }) => {
  const existing = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.email, email))
    .limit(1);
  if (existing.length > 0)
    throw new Error("An account with this email already exists");

  const hashed = await bcrypt.hash(password, 10);
  const [account] = await db
    .insert(customerAccounts)
    .values({ name, email, phone, password: hashed })
    .returning();
  return { id: account.id, name: account.name, email: account.email };
};

export const loginCustomer = async (email, password) => {
  const result = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.email, email))
    .limit(1);
  if (result.length === 0) throw new Error("Invalid email or password");
  const account = result[0];

  const valid = await bcrypt.compare(password, account.password);
  if (!valid) throw new Error("Invalid email or password");

  return { id: account.id, name: account.name, email: account.email };
};

export const getBusinessBySlugForReviews = async (slug) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Store not found");
  return bizResult[0];
};

export const getCustomerOrders = async (customerAccountId) => {
  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.customerAccountId, customerAccountId))
    .orderBy(desc(orders.createdAt));

  return Promise.all(
    list.map(async (order) => {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      const bizResult = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, order.businessId))
        .limit(1);
      return {
        ...order,
        totalAmount: order.totalAmount / 100,
        deliveryFee: order.deliveryFee / 100,
        businessName: bizResult[0]?.name,
        businessSlug: bizResult[0]?.slug,
        items: items.map((i) => ({ ...i, unitPrice: i.unitPrice / 100 })),
      };
    }),
  );
};

export const getCustomerById = async (id) => {
  const result = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.id, id))
    .limit(1);
  if (result.length === 0) return null;
  const { password, ...safe } = result[0];
  return safe;
};

/*export const getDirectory = async ({ search, category }) => {
  const conditions = [eq(businesses.visibility, "public")];

  if (search) {
    conditions.push(ilike(businesses.name, `%${search}%`));
  }

  if (category) {
    conditions.push(eq(businesses.category, category));
  }

  const result = await db
    .select()
    .from(businesses)
    .where(and(...conditions))
    .orderBy(businesses.name);

  return result;
};

*/

export const getDirectory = async ({ search, category } = {}) => {
  const results = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      shortName: businesses.shortName,
      slug: businesses.slug,
      logoUrl: businesses.logoUrl,
      description: businesses.description,
      address: businesses.address,
      isAvailable: businesses.isAvailable,
      availableDays: businesses.availableDays,
      userId: businesses.userId,
      isVerified: businesses.verificationStatus,
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.visibility, "public"),
        eq(businesses.verificationStatus, "approved"),
      ),
    );

  const dayAbbrev = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = dayAbbrev[new Date().getDay()];

  const enriched = await Promise.all(
    results.map(async (biz) => {
      const productList = await db
        .select()
        .from(products)
        .where(eq(products.businessId, biz.id));
      const categories = [...new Set(productList.map((p) => p.category))];
      const stats = await getReviewStats(biz.id);

      const subResult = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, biz.userId))
        .limit(1);
      const plan = subResult[0]?.plan || "starter";

      const isOpenToday = biz.isAvailable && biz.availableDays.includes(today);

      return {
        ...biz,
        productCount: productList.length,
        categories,
        avgRating: stats.avgRating,
        reviewCount: stats.total,
        plan,
        isOpenToday,
        isVerified: biz.isVerified,
      };
    }),
  );

  let filtered = enriched.filter((b) => b.productCount > 0);

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(s) ||
        b.description?.toLowerCase().includes(s),
    );
  }
  if (category && category !== "All") {
    filtered = filtered.filter((b) => b.categories.includes(category));
  }

  return filtered;
};

export const trackOrder = async (orderNumber, phone) => {
  const orderResult = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (orderResult.length === 0) throw new Error("Order not found");
  const order = orderResult[0];

  const normalizedInput = phone.replace(/\D/g, "").slice(-10);
  const normalizedOnFile = (order.customerPhone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (normalizedInput !== normalizedOnFile) {
    throw new Error("Phone number does not match this order");
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, order.businessId))
    .limit(1);
  const dispatch = await getOrderDispatch(order.businessId, order.id).catch(
    () => null,
  );

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount / 100,
    deliveryFee: order.deliveryFee / 100,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt,
    businessName: bizResult[0]?.name,
    businessSlug: bizResult[0]?.slug,
    items: items.map((i) => ({ ...i, unitPrice: i.unitPrice / 100 })),
    dispatch: dispatch
      ? {
          riderName: dispatch.riderName,
          riderPhone: dispatch.riderPhone,
          status: dispatch.status,
          currentLat: dispatch.currentLat ? Number(dispatch.currentLat) : null,
          currentLng: dispatch.currentLng ? Number(dispatch.currentLng) : null,
        }
      : null,
    orderId: order.id,
  };
};
