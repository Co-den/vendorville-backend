import { db } from "#config/database.js";
import { subscriptions } from "#models/subscription.js";
import { paystackApi } from "#utils/paystack.js";
import { eq, gt, lt, and } from "drizzle-orm";

const planPrices = { starter: 5500, professional: 10500, enterprise: 15500 };

export const staffLimits = {
  starter: 1,
  professional: 3,
  enterprise: Infinity,
};

const TRIAL_DAYS = 14;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS = 30;
const SUBSCRIPTION_MS = SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000;

// Get or create subscription
export const getSubscription = async (userId) => {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (result.length === 0) {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_MS);

    const [created] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan: "starter",
        trialEndsAt,
        status: "trial",
      })
      .returning();

    return created;
  }

  return result[0];
};

// Check if user is in trial
export const isInTrial = (subscription) => {
  if (!subscription.trialEndsAt) return false;
  return new Date() < new Date(subscription.trialEndsAt);
};

// Get trial remaining days
export const getTrialDaysRemaining = (subscription) => {
  if (!isInTrial(subscription)) return 0;

  const now = new Date();
  const trialEnd = new Date(subscription.trialEndsAt);
  const daysRemaining = Math.ceil(
    (trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );

  return Math.max(0, daysRemaining);
};

// Check if trial is expired
export const isTrialExpired = (subscription) => {
  if (!subscription.trialEndsAt) return false;
  return new Date() >= new Date(subscription.trialEndsAt);
};

// Upgrade subscription (after trial or at any time)
export const upgradeSubscription = async (userId, plan, paystackReference) => {
  const verification = await paystackApi.verifyTransaction(paystackReference);
  const expectedAmount = planPrices[plan] * 100;

  if (
    verification.status !== "success" ||
    verification.amount !== expectedAmount
  ) {
    throw new Error("Payment verification failed");
  }

  const renewsAt = new Date(Date.now() + SUBSCRIPTION_MS);

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan,
        renewsAt,
        status: "active",
        trialEndsAt: null,
      })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      plan,
      renewsAt,
      status: "active",
      trialEndsAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning();

  return updated;
};

// Get subscription stats by plan
export const getSubscriptionStats = async () => {
  const now = new Date();

  // Count active subscriptions by plan
  const activeByPlan = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.status, "active"), gt(subscriptions.renewsAt, now)),
    );

  // Count trial subscriptions by plan
  const trialByPlan = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trial"),
        gt(subscriptions.trialEndsAt, now),
      ),
    );

  // Count expired trials
  const expiredTrials = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trial"),
        lt(subscriptions.trialEndsAt, now),
      ),
    );

  const stats = {
    total: activeByPlan.length + trialByPlan.length,
    active: activeByPlan.length,
    trial: trialByPlan.length,
    expiredTrial: expiredTrials.length,
    byPlan: {
      starter: {
        active: activeByPlan.filter((s) => s.plan === "starter").length,
        trial: trialByPlan.filter((s) => s.plan === "starter").length,
      },
      professional: {
        active: activeByPlan.filter((s) => s.plan === "professional").length,
        trial: trialByPlan.filter((s) => s.plan === "professional").length,
      },
      enterprise: {
        active: activeByPlan.filter((s) => s.plan === "enterprise").length,
        trial: trialByPlan.filter((s) => s.plan === "enterprise").length,
      },
    },
  };

  return stats;
};

// Get subscription count by plan
export const getSubscriptionCountByPlan = async () => {
  const now = new Date();

  const starterActive = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.plan, "starter"),
        eq(subscriptions.status, "active"),
        gt(subscriptions.renewsAt, now),
      ),
    );

  const professionalActive = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.plan, "professional"),
        eq(subscriptions.status, "active"),
        gt(subscriptions.renewsAt, now),
      ),
    );

  const enterpriseActive = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.plan, "enterprise"),
        eq(subscriptions.status, "active"),
        gt(subscriptions.renewsAt, now),
      ),
    );

  return {
    starter: starterActive.length,
    professional: professionalActive.length,
    enterprise: enterpriseActive.length,
    total:
      starterActive.length +
      professionalActive.length +
      enterpriseActive.length,
  };
};

// Handling trial expiration by cron job or manual call
export const handleTrialExpiration = async (userId) => {
  const [updated] = await db
    .update(subscriptions)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning();

  return updated;
};

// Check if the user can add staff based on plan limits
export const canAddStaff = async (userId) => {
  const subscription = await getSubscription(userId);
  const limit = staffLimits[subscription.plan];

  if (limit === Infinity) return true;

  // Checking existing staff num
  const staffCount = await db
    .select()
    .from(staff)
    .where(eq(staff.businessId, userId));

  return staffCount.length < limit;
};
