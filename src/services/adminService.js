import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { admins } from "#models/admin.js";
import { businesses } from "#models/business.js";
import { subscriptions } from "#models/subscription.js";
import { users } from "#models/user.js";
import Email from "#utils/email.js";
import bcrypt from "bcrypt";
import { desc, eq } from "drizzle-orm";

export const loginAdmin = async (email, password) => {
  const result = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);
  if (result.length === 0) throw new Error("Invalid email or password");
  const admin = result[0];

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new Error("Invalid email or password");

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
};

export const getPendingBusinesses = async () => {
  return db
    .select()
    .from(businesses)
    .where(eq(businesses.verificationStatus, "pending"))
    .orderBy(desc(businesses.createdAt));
};

export const getAllBusinesses = async (status) => {
  const query = db.select().from(businesses);
  if (status && status !== "all") {
    return query
      .where(eq(businesses.verificationStatus, status))
      .orderBy(desc(businesses.createdAt));
  }
  return query.orderBy(desc(businesses.createdAt));
};

export const approveBusiness = async (businessId) => {
  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Business not found");
  const business = bizResult[0];

  const [updated] = await db
    .update(businesses)
    .set({
      verificationStatus: "approved",
      isVerified: true,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId))
    .returning();

  const ownerResult = await db
    .select()
    .from(users)
    .where(eq(users.id, business.userId))
    .limit(1);
  if (ownerResult.length > 0) {
    new Email(ownerResult[0])
      .sendNotification(
        "Your business has been approved!",
        `${business.name} is now verified and visible on VendorVille.`,
      )
      .catch((err) => logger.error("Approval email error", err));
  }

  return updated;
};

export const rejectBusiness = async (businessId, reason) => {
  if (!reason) throw new Error("A rejection reason is required");

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (bizResult.length === 0) throw new Error("Business not found");
  const business = bizResult[0];

  const [updated] = await db
    .update(businesses)
    .set({
      verificationStatus: "rejected",
      isVerified: false,
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId))
    .returning();

  const ownerResult = await db
    .select()
    .from(users)
    .where(eq(users.id, business.userId))
    .limit(1);
  if (ownerResult.length > 0) {
    new Email(ownerResult[0])
      .sendNotification(
        "Update on your business registration",
        `${business.name} was not approved. Reason: ${reason}`,
      )
      .catch((err) => logger.error("Rejection email error", err));
  }

  return updated;
};

export const getStats = async () => {
  const allBusinesses = await db.select().from(businesses);
  return {
    total: allBusinesses.length,
    pending: allBusinesses.filter((b) => b.verificationStatus === "pending")
      .length,
    approved: allBusinesses.filter((b) => b.verificationStatus === "approved")
      .length,
    rejected: allBusinesses.filter((b) => b.verificationStatus === "rejected")
      .length,
  };
};

export const getEnhancedStats = async () => {
  const allBusinesses = await db.select().from(businesses);
  const allSubs = await db.select().from(subscriptions);

  // Businesses grouped by plan (via their owner's subscription)
  const businessesByOwner = {};
  allBusinesses.forEach((b) => {
    if (!businessesByOwner[b.userId]) businessesByOwner[b.userId] = 0;
    businessesByOwner[b.userId]++;
  });

  const planCounts = { starter: 0, professional: 0, enterprise: 0 };
  const planBusinessCounts = { starter: 0, professional: 0, enterprise: 0 };

  allSubs.forEach((sub) => {
    planCounts[sub.plan] = (planCounts[sub.plan] || 0) + 1;
    planBusinessCounts[sub.plan] =
      (planBusinessCounts[sub.plan] || 0) +
      (businessesByOwner[sub.userId] || 0);
  });

  // Total subscription revenue (based on plan prices mirrors your subscriptionService.js pricing)
  const planPrices = { starter: 5500, professional: 10500, enterprise: 15500 };
  const totalSubscriptionRevenue = allSubs.reduce((sum, sub) => {
    return sum + (planPrices[sub.plan] || 0);
  }, 0);

  // Vendors grouped by state derived from business address text.
  // Since address is free-text, we match against known Nigerian state names.
  const nigerianStates = [
    "Lagos",
    "Abuja",
    "FCT",
    "Rivers",
    "Kano",
    "Oyo",
    "Delta",
    "Edo",
    "Kaduna",
    "Imo",
    "Plateau",
    "Anambra",
    "Enugu",
    "Abia",
    "Cross River",
    "Ogun",
    "Ondo",
    "Osun",
    "Ekiti",
    "Kwara",
    "Kogi",
    "Benue",
    "Niger",
    "Sokoto",
    "Kebbi",
    "Zamfara",
    "Katsina",
    "Jigawa",
    "Bauchi",
    "Gombe",
    "Adamawa",
    "Taraba",
    "Yobe",
    "Borno",
    "Nasarawa",
    "Ebonyi",
    "Akwa Ibom",
    "Bayelsa",
  ];

  const stateCounts = {};
  allBusinesses.forEach((b) => {
    const matchedState = nigerianStates.find((state) =>
      b.address.toLowerCase().includes(state.toLowerCase()),
    );
    const key = matchedState || "Unspecified";
    stateCounts[key] = (stateCounts[key] || 0) + 1;
  });

  const locationData = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: allBusinesses.length,
    pending: allBusinesses.filter((b) => b.verificationStatus === "pending")
      .length,
    approved: allBusinesses.filter((b) => b.verificationStatus === "approved")
      .length,
    rejected: allBusinesses.filter((b) => b.verificationStatus === "rejected")
      .length,
    planCounts,
    planBusinessCounts,
    totalSubscriptionRevenue: totalSubscriptionRevenue,
    locationData,
  };
};
