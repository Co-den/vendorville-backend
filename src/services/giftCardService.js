import crypto from "crypto";

const generateGiftCardCode = () => {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
};

export const issueGiftCard = async (userId, businessId, valueNaira) => {
  await assertFeatureAccess(userId);

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

export const redeemGiftCard = async (businessId, code, amountKobo) => {
  const result = await db
    .select()
    .from(giftCards)
    .where(
      and(
        eq(giftCards.businessId, businessId),
        eq(giftCards.code, code),
        eq(giftCards.isActive, true),
      ),
    )
    .limit(1);

  if (result.length === 0) throw new Error("Invalid or inactive gift card");
  const card = result[0];

  if (card.remainingValue < amountKobo) {
    throw new Error(
      `Gift card only has ₦${(card.remainingValue / 100).toLocaleString()} remaining`,
    );
  }

  await db
    .update(giftCards)
    .set({ remainingValue: card.remainingValue - amountKobo })
    .where(eq(giftCards.id, card.id));

  return {
    appliedKobo: amountKobo,
    remainingKobo: card.remainingValue - amountKobo,
  };
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
