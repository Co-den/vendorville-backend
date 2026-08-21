import { db } from "#config/database.js";
import { pushSubscriptions } from "#models/pushSubscription.js";
import { and, eq } from "drizzle-orm";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export const saveSubscription = async (userId, userType, subscription) => {
  const { endpoint, keys } = subscription;

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.userType, userType),
      ),
    )
    .limit(1);

  if (existing.length > 0) return existing[0];
  const [saved] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      userType,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .returning();

  return saved;
};

export const removeSubscription = async (endpoint) => {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
};

export const sendPushToUser = async (userId, userType, payload) => {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.userType, userType),
      ),
    );

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      ),
    ),
  );

  results.forEach((result, i) => {
    if (
      result.status === "rejected" &&
      [404, 410].includes(result.reason?.statusCode)
    ) {
      removeSubscription(subs[i].endpoint).catch(() => {});
    }
  });

  return results;
};
