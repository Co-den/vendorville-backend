import { db } from "#config/database.js";
import { businesses } from "#models/business.js";
import {
  giftCards,
  loyaltyPoints,
  loyaltyTransactions,
} from "#models/loyalty.js";
import { getSubscription } from "#services/subscriptionService.js";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";

export const POINTS_PER_NAIRA = 1;
export const POINT_VALUE_KOBO = 100;

const assertFeatureAccess = async (userId) => {
  const sub = await getSubscription(userId);
  if (sub.plan === "starter") {
    throw new Error(
      "Gift cards and loyalty points require a Professional or Enterprise plan.",
    );
  }
};

export const getBusinessBySlug = async (slug) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Store not found");
  return bizResult[0];
};

export const awardPointsForOrder = async (
  businessId,
  customerAccountId,
  orderTotalNaira,
) => {
  if (!customerAccountId) return;

  const orderTotalKobo = Math.round(orderTotalNaira * 100);
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
  if (pointsToRedeem <= 0) throw new Error("Invalid point amount");

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

  return {
    discountKobo: pointsToRedeem * POINT_VALUE_KOBO,
    discountNaira: (pointsToRedeem * POINT_VALUE_KOBO) / 100,
  };
};

const generateGiftCardCode = () =>
  crypto.randomBytes(6).toString("hex").toUpperCase();

export const issueGiftCard = async (userId, businessId, valueNaira) => {
  await assertFeatureAccess(userId);
  if (!valueNaira || valueNaira <= 0)
    throw new Error("Enter a valid gift card value");

  const code = generateGiftCardCode();
  const valueKobo = Math.round(valueNaira * 100);

  const [card] = await db
    .insert(giftCards)
    .values({
      businessId,
      code,
      initialValue: valueKobo,
      remainingValue: valueKobo,
    })
    .returning();

  return {
    ...card,
    initialValue: card.initialValue / 100,
    remainingValue: card.remainingValue / 100,
  };
};

export const checkGiftCard = async (businessId, code) => {
  const result = await db
    .select()
    .from(giftCards)
    .where(
      and(
        eq(giftCards.businessId, businessId),
        eq(giftCards.code, code.toUpperCase()),
        eq(giftCards.isActive, true),
      ),
    )
    .limit(1);

  if (result.length === 0)
    throw new Error("Invalid or inactive gift card code");
  const card = result[0];
  if (card.remainingValue <= 0)
    throw new Error("This gift card has no remaining balance");

  return { valid: true, remainingValue: card.remainingValue / 100 };
};

export const redeemGiftCard = async (businessId, code, amountKobo) => {
  const result = await db
    .select()
    .from(giftCards)
    .where(
      and(
        eq(giftCards.businessId, businessId),
        eq(giftCards.code, code.toUpperCase()),
        eq(giftCards.isActive, true),
      ),
    )
    .limit(1);

  if (result.length === 0) throw new Error("Invalid or inactive gift card");
  const card = result[0];

  const applied = Math.min(card.remainingValue, amountKobo);

  await db
    .update(giftCards)
    .set({ remainingValue: card.remainingValue - applied })
    .where(eq(giftCards.id, card.id));

  return { appliedKobo: applied, remainingKobo: card.remainingValue - applied };
};

export const getGiftCards = async (userId, businessId) => {
  await assertFeatureAccess(userId);
  const cards = await db
    .select()
    .from(giftCards)
    .where(eq(giftCards.businessId, businessId));
  return cards.map((c) => ({
    ...c,
    initialValue: c.initialValue / 100,
    remainingValue: c.remainingValue / 100,
  }));
};
