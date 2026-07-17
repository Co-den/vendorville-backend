import { db } from "#config/database.js";
import { businesses, businessImages } from "#models/business.js";
import { customerAccounts } from "#models/customerAccount.js";
import { orderItems, orders } from "#models/order.js";
import { products } from "#models/product.js";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export const getStorefront = async (slug) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (bizResult.length === 0 || bizResult[0].visibility !== "public") {
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

  return {
    business: {
      id: biz.id,
      name: biz.name,
      shortName: biz.shortName,
      logoUrl: biz.logoUrl,
      description: biz.description,
      whatsappNumber: biz.whatsappNumber,
      address: biz.address,
      premisesImages: images.map((i) => i.imageUrl),
    },
    products: productList
      .filter((p) => p.stock > 0)
      .map((p) => ({ ...p, price: p.price / 100 })),
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
    paymentMethod,
    items,
  } = data;

  if (!items || items.length === 0)
    throw new Error("Order must include at least one item");
  if (!customerName || !customerPhone)
    throw new Error("Name and phone are required");
  if (!deliveryAddress) throw new Error("Delivery address is required");

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

  const deliveryFee = data.deliveryFee
    ? Math.round(Number(data.deliveryFee) * 100)
    : 0;
  const orderNumber = generateOrderNumber();
  const paystackReference = `store_${orderNumber}`;
  const result = await db.transaction(async (tx) => {
    const [newOrder] = await tx
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
        paymentMethod,
        status: "pending",
        source: "storefront",
        paystackReference,
      })
      .returning();

    await tx
      .insert(orderItems)
      .values(resolvedItems.map((item) => ({ ...item, orderId: newOrder.id })));

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

  return {
    ...result,
    totalAmount: result.totalAmount / 100,
    deliveryFee: result.deliveryFee / 100,
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

export const getDirectory = async ({ search, category } = {}) => {
  let query = db
    .select({
      id: businesses.id,
      name: businesses.name,
      shortName: businesses.shortName,
      slug: businesses.slug,
      logoUrl: businesses.logoUrl,
      description: businesses.description,
      address: businesses.address,
    })
    .from(businesses)
    .where(eq(businesses.visibility, "public"));

  const results = await query;

  // Get product counts and one representative category per business, for filtering/display
  const enriched = await Promise.all(
    results.map(async (biz) => {
      const productList = await db
        .select()
        .from(products)
        .where(eq(products.businessId, biz.id));
      const categories = [...new Set(productList.map((p) => p.category))];
      return {
        ...biz,
        productCount: productList.length,
        categories,
      };
    }),
  );

  let filtered = enriched.filter((b) => b.productCount > 0); // only show vendors with actual products

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
