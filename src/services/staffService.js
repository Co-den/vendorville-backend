import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses } from "#models/business.js";
import { staffMembers } from "#models/staff.js";
import { getSubscription, staffLimits } from "#services/subscriptionService.js";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";

const assertBusinessOwnership = async (userId, businessId) => {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Business not found or not yours");
  }
  return result[0];
};

export const getStaff = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);
  const list = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.businessId, businessId));
  return list.map(({ password, ...rest }) => rest);
};

export const inviteStaff = async (
  userId,
  businessId,
  { name, email, role, tempPassword },
) => {
  await assertBusinessOwnership(userId, businessId);

  const sub = await getSubscription(userId);
  const limit = staffLimits[sub.plan] ?? 1;

  const existing = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.businessId, businessId));
  if (existing.length >= limit) {
    throw new Error("STAFF_LIMIT_REACHED");
  }

  const duplicateEmail = existing.find(
    (s) => s.email.toLowerCase() === email.toLowerCase(),
  );
  if (duplicateEmail)
    throw new Error(
      "A staff member with this email already exists for this business",
    );

  const hashed = await bcrypt.hash(tempPassword, 10);

  const [staff] = await db
    .insert(staffMembers)
    .values({
      businessId,
      name,
      email,
      password: hashed,
      role: role || "staff",
    })
    .returning({
      id: staffMembers.id,
      name: staffMembers.name,
      email: staffMembers.email,
      role: staffMembers.role,
      isActive: staffMembers.isActive,
      createdAt: staffMembers.createdAt,
    });

  logger.info(`Staff "${email}" invited to business ${businessId}`);
  return staff;
};

export const removeStaff = async (userId, businessId, staffId) => {
  await assertBusinessOwnership(userId, businessId);
  await db
    .delete(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId),
      ),
    );
};

export const toggleStaffActive = async (
  userId,
  businessId,
  staffId,
  isActive,
) => {
  await assertBusinessOwnership(userId, businessId);
  const [updated] = await db
    .update(staffMembers)
    .set({ isActive })
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId),
      ),
    )
    .returning({ id: staffMembers.id, isActive: staffMembers.isActive });
  return updated;
};

export const loginStaff = async (email, password) => {
  const result = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.email, email))
    .limit(1);
  if (result.length === 0) throw new Error("Invalid email or password");
  const staff = result[0];

  if (!staff.isActive)
    throw new Error("This staff account has been deactivated");

  const valid = await bcrypt.compare(password, staff.password);
  if (!valid) throw new Error("Invalid email or password");

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, staff.businessId))
    .limit(1);

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    businessId: staff.businessId,
    businessName: bizResult[0]?.name,
  };
};
