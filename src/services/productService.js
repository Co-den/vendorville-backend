import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses } from "#models/business.js";
import { products } from "#models/product.js";
import { uploadBufferToCloudinary } from "#utils/uploadToCloudinary.js";
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
};

export const getProducts = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);
  const list = await db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId));
  return list.map((p) => ({ ...p, price: p.price / 100 }));
};

export const createProduct = async (userId, businessId, data, file) => {
  await assertBusinessOwnership(userId, businessId);

  let imageUrl = null;
  if (file) {
    imageUrl = await uploadBufferToCloudinary(
      file.buffer,
      "vendorhub/products",
    );
  }

  const [newProduct] = await db
    .insert(products)
    .values({
      businessId,
      name: data.name,
      sku: data.sku,
      category: data.category,
      imageUrl,
      price: Math.round(Number(data.price) * 100),
      stock: Number(data.stock),
      lowStockThreshold: Number(data.lowStockThreshold),
    })
    .returning();

  logger.info(`Product "${newProduct.name}" added to business ${businessId}`);
  return { ...newProduct, price: newProduct.price / 100 };
};

export const updateProduct = async (
  userId,
  businessId,
  productId,
  data,
  file,
) => {
  await assertBusinessOwnership(userId, businessId);

  const productResult = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (
    productResult.length === 0 ||
    productResult[0].businessId !== businessId
  ) {
    throw new Error("Product not found");
  }

  let imageUrl = productResult[0].imageUrl;
  if (file) {
    imageUrl = await uploadBufferToCloudinary(
      file.buffer,
      "vendorhub/products",
    );
  }

  const [updated] = await db
    .update(products)
    .set({
      name: data.name,
      sku: data.sku,
      category: data.category,
      imageUrl,
      price: Math.round(Number(data.price) * 100),
      stock: Number(data.stock),
      lowStockThreshold: Number(data.lowStockThreshold),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
    .returning();

  return { ...updated, price: updated.price / 100 };
};

export const deleteProduct = async (userId, businessId, productId) => {
  await assertBusinessOwnership(userId, businessId);
  await db
    .delete(products)
    .where(
      and(eq(products.id, productId), eq(products.businessId, businessId)),
    );
};
