import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses } from "#models/business.js";
import { orders } from "#models/order.js";
import { reviews } from "#models/review.js";
import { and, desc, eq } from "drizzle-orm";

export const getReviews = async (businessId) => {
  const list = await db
    .select()
    .from(reviews)
    .where(eq(reviews.businessId, businessId))
    .orderBy(desc(reviews.createdAt));
  return list;
};

export const getReviewStats = async (businessId) => {
  const list = await getReviews(businessId);
  const total = list.length;
  const avgRating =
    total > 0 ? list.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const breakdown = [5, 4, 3, 2, 1].map(
    (star) => list.filter((r) => r.rating === star).length,
  );
  return { total, avgRating, breakdown };
};

export const submitReview = async (
  slug,
  { orderNumber, phone, rating, comment },
) => {
  if (!orderNumber || !phone)
    throw new Error("Order number and phone number are required");
  if (!rating || rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5");

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Store not found");
  const business = bizResult[0];

  const orderResult = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber),
        eq(orders.businessId, business.id),
      ),
    )
    .limit(1);

  if (orderResult.length === 0) {
    throw new Error("We couldn't find that order for this store");
  }
  const order = orderResult[0];

  // Verify the phone number matches what was used at checkout
  const normalizedInput = phone.replace(/\D/g, "").slice(-10);
  const normalizedOnFile = (order.customerPhone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (normalizedInput !== normalizedOnFile) {
    throw new Error("Phone number does not match the one used for this order");
  }

  // Prevent duplicate reviews for the same order
  const existing = await db
    .select()
    .from(reviews)
    .where(eq(reviews.orderId, order.id))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("You've already left a review for this order");
  }

  const [newReview] = await db
    .insert(reviews)
    .values({
      businessId: business.id,
      orderId: order.id,
      customerName: order.customerName,
      rating,
      comment: comment || null,
    })
    .returning();

  logger.info(
    `Review submitted for business ${business.id}, order ${orderNumber}`,
  );
  return newReview;
};

export const replyToReview = async (
  userId,
  businessId,
  reviewId,
  replyText,
) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (bizResult.length === 0 || bizResult[0].userId !== userId) {
    throw new Error("Business not found or not yours");
  }

  const reviewResult = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (reviewResult.length === 0 || reviewResult[0].businessId !== businessId) {
    throw new Error("Review not found");
  }

  const [updated] = await db
    .update(reviews)
    .set({ vendorReply: replyText })
    .where(eq(reviews.id, reviewId))
    .returning();

  return updated;
};
