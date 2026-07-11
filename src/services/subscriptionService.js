import { db } from "#config/database.js";
import { subscriptions } from "#models/subscription.js";
import { paystackApi } from "#utils/paystack.js";
import { eq } from "drizzle-orm";

const planPrices = { starter: 5500, professional: 10500, enterprise: 15500 };

export const getSubscription = async (userId) => {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (result.length === 0) {
    const [created] = await db
      .insert(subscriptions)
      .values({ userId, plan: "starter" })
      .returning();
    return created;
  }
  return result[0];
};

export const upgradeSubscription = async (userId, plan, paystackReference) => {
  const verification = await paystackApi.verifyTransaction(paystackReference);
  const expectedAmount = planPrices[plan] * 100;

  if (
    verification.status !== "success" ||
    verification.amount !== expectedAmount
  ) {
    throw new Error("Payment verification failed");
  }

  const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing.length === 0) {
    const [created] = await db
      .insert(subscriptions)
      .values({ userId, plan, renewsAt })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(subscriptions)
    .set({ plan, renewsAt, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId))
    .returning();
  return updated;
};
