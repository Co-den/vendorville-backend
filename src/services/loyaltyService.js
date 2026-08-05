import { getSubscription } from "#services/subscriptionService.js";

const assertFeatureAccess = async (userId) => {
  const sub = await getSubscription(userId);
  if (sub.plan === "starter") {
    throw new Error(
      "Gift cards and loyalty points require a Professional or Enterprise plan.",
    );
  }
};

const POINTS_PER_NAIRA = 1;
const POINT_VALUE_KOBO = 100;

export const awardPointsForOrder = async (
  businessId,
  customerAccountId,
  orderTotalKobo,
) => {
  if (!customerAccountId) return;

  const pointsEarned = Math.floor(
    ((orderTotalKobo / 100) * POINTS_PER_NAIRA) / 100,
  );
  if (pointsEarned <= 0) return;

  const existing = await db
    .select()
    .from(loyaltyPoints)
    .where(
      and(
        eq(loyaltyPoints.businessId, businessId),
        eq(loyaltyPoints.customerAccountId, customerAccountId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await db
      .insert(loyaltyPoints)
      .values({ businessId, customerAccountId, points: pointsEarned });
  } else {
    await db
      .update(loyaltyPoints)
      .set({ points: existing[0].points + pointsEarned, updatedAt: new Date() })
      .where(eq(loyaltyPoints.id, existing[0].id));
  }

  await db.insert(loyaltyTransactions).values({
    businessId,
    customerAccountId,
    points: pointsEarned,
    reason: "order_completed",
  });
};

export const getCustomerPoints = async (businessId, customerAccountId) => {
  const result = await db
    .select()
    .from(loyaltyPoints)
    .where(
      and(
        eq(loyaltyPoints.businessId, businessId),
        eq(loyaltyPoints.customerAccountId, customerAccountId),
      ),
    )
    .limit(1);
  return result[0]?.points || 0;
};

export const redeemPointsForDiscount = async (
  businessId,
  customerAccountId,
  pointsToRedeem,
) => {
  const current = await getCustomerPoints(businessId, customerAccountId);
  if (pointsToRedeem > current) throw new Error("Insufficient points");

  await db
    .update(loyaltyPoints)
    .set({ points: current - pointsToRedeem, updatedAt: new Date() })
    .where(
      and(
        eq(loyaltyPoints.businessId, businessId),
        eq(loyaltyPoints.customerAccountId, customerAccountId),
      ),
    );

  await db.insert(loyaltyTransactions).values({
    businessId,
    customerAccountId,
    points: -pointsToRedeem,
    reason: "redeemed_for_discount",
  });

  return { discountKobo: pointsToRedeem * POINT_VALUE_KOBO };
};
