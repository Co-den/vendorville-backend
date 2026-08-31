import cron from "node-cron";
import { db } from "#config/database.js";
import { subscriptions } from "#models/subscription.js";
import { users } from "#models/user.js";
import { and, eq, lte } from "drizzle-orm";
import { kudismsApi } from "#utils/kudisms.js";
import Email from "#utils/email.js";
import logger from "#config/logger.js";

export const startTrialExpirationJob = () => {
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("[Cron] Running trial expiration check...");

      const now = new Date();

      const expiredTrials = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "trial"),
            lte(subscriptions.trialEndsAt, now),
          ),
        );

      if (expiredTrials.length === 0) {
        logger.info("[Cron] No expired trials found");
        return;
      }

      await db
        .update(subscriptions)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.status, "trial"),
            lte(subscriptions.trialEndsAt, now),
          ),
        );

      logger.info(
        `[Cron] Expired ${expiredTrials.length} trial subscription(s)`,
      );

      for (const trial of expiredTrials) {
        await notifyTrialExpired(trial.userId);
      }
    } catch (error) {
      logger.error("[Cron] Trial expiration job failed:", error);
    }
  });

  logger.info("[Cron] Trial expiration job scheduled (daily at 2 AM)");
};

const notifyTrialExpired = async (userId) => {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userResult.length) {
      logger.warn(`User not found for trial expiration: ${userId}`);
      return;
    }

    const user = userResult[0];

    // Send SMS
    if (user.phone) {
      try {
        const message = `Hi ${user.businessName || user.name},

Your 14-day VendorVille free trial has ended. Upgrade now to continue managing your business seamlessly.

Visit: ${process.env.FRONTEND_URL}/pricing

Thank you!`;

        await kudismsApi.sendSms(
          user.phone,
          message,
          user.businessName || user.name,
          "VendorVille",
        );
      } catch (error) {
        logger.error(`Failed to send SMS to ${user.phone}:`, error);
      }
    }

    // Send Email
    if (user.email) {
      try {
        const emailClient = new Email(user, "");
        await emailClient.sendTrialExpired();
      } catch (error) {
        logger.error(`Failed to send email to ${user.email}:`, error);
      }
    }

    logger.info(`Trial expiration notification sent to user ${userId}`);
  } catch (error) {
    logger.error(
      `Failed to notify user ${userId} about trial expiration:`,
      error,
    );
  }
};

export const manualTrialExpirationCheck = async () => {
  try {
    const now = new Date();

    const expiredTrials = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "trial"),
          lte(subscriptions.trialEndsAt, now),
        ),
      );

    if (expiredTrials.length === 0) {
      return {
        success: true,
        message: "No expired trials found",
        count: 0,
      };
    }

    await db
      .update(subscriptions)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.status, "trial"),
          lte(subscriptions.trialEndsAt, now),
        ),
      );

    for (const trial of expiredTrials) {
      await notifyTrialExpired(trial.userId);
    }

    logger.info(`Manual check: Expired ${expiredTrials.length} trial(s)`);

    return {
      success: true,
      message: `Expired ${expiredTrials.length} trial subscription(s)`,
      count: expiredTrials.length,
    };
  } catch (error) {
    logger.error("Manual trial expiration check failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getUpcomingTrialExpirations = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await db
      .select({
        userId: subscriptions.userId,
        plan: subscriptions.plan,
        trialEndsAt: subscriptions.trialEndsAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "trial"),
          lte(subscriptions.trialEndsAt, sevenDaysFromNow),
          lte(now, subscriptions.trialEndsAt),
        ),
      );

    return {
      count: upcoming.length,
      expirations: upcoming,
    };
  } catch (error) {
    logger.error("Failed to get upcoming trial expirations:", error);
    return {
      count: 0,
      expirations: [],
    };
  }
};
