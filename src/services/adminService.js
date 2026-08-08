import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { admins } from "#models/admin.js";
import { businesses } from "#models/business.js";
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
