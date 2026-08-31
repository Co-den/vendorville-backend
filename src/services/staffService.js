// services/staffService.js
import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses } from "#models/business.js";
import { staffMembers } from "#models/staff.js";
import { getSubscription, staffLimits } from "#services/subscriptionService.js";
import Email from "#utils/email.js";
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

export const getStaffCount = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);
  const list = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.businessId, businessId));
  return list.length;
};

export const getStaffById = async (userId, businessId, staffId) => {
  await assertBusinessOwnership(userId, businessId);
  const result = await db
    .select()
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error("Staff member not found");
  }

  const { password, ...staff } = result[0];
  return staff;
};

export const inviteStaff = async (
  userId,
  businessId,
  { name, email, role, tempPassword }
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
    (s) => s.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicateEmail) {
    throw new Error(
      "A staff member with this email already exists for this business"
    );
  }

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

  // Send invitation email
  try {
    const user = { firstName: name, email };
    const emailClient = new Email(user, "");
    await emailClient.sendStaffInvitation(email, tempPassword);
  } catch (error) {
    logger.error(`Failed to send staff invitation email to ${email}:`, error);
  }

  return staff;
};

export const removeStaff = async (userId, businessId, staffId) => {
  await assertBusinessOwnership(userId, businessId);

  const staff = await db
    .select()
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .limit(1);

  if (staff.length === 0) {
    throw new Error("Staff member not found");
  }

  await db
    .delete(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    );

  logger.info(`Staff ${staffId} removed from business ${businessId}`);
};

export const toggleStaffActive = async (
  userId,
  businessId,
  staffId,
  isActive
) => {
  await assertBusinessOwnership(userId, businessId);

  const staff = await db
    .select()
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .limit(1);

  if (staff.length === 0) {
    throw new Error("Staff member not found");
  }

  const [updated] = await db
    .update(staffMembers)
    .set({ isActive })
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .returning({
      id: staffMembers.id,
      name: staffMembers.name,
      isActive: staffMembers.isActive,
    });

  logger.info(
    `Staff ${staffId} ${isActive ? "activated" : "deactivated"} in business ${businessId}`
  );

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

  if (!staff.isActive) {
    throw new Error("This staff account has been deactivated");
  }

  const valid = await bcrypt.compare(password, staff.password);
  if (!valid) throw new Error("Invalid email or password");

  const bizResult = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, staff.businessId))
    .limit(1);

  logger.info(`Staff ${email} logged in`);

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    businessId: staff.businessId,
    businessName: bizResult[0]?.name,
  };
};

export const emailExistsAsStaff = async (email) => {
  const result = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.email, email))
    .limit(1);
  return result.length > 0;
};

export const updateStaffRole = async (userId, businessId, staffId, newRole) => {
  await assertBusinessOwnership(userId, businessId);

  const validRoles = ["admin", "manager", "staff"];
  if (!validRoles.includes(newRole)) {
    throw new Error("Invalid role");
  }

  const [updated] = await db
    .update(staffMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .returning({
      id: staffMembers.id,
      name: staffMembers.name,
      role: staffMembers.role,
    });

  if (!updated) {
    throw new Error("Staff member not found");
  }

  logger.info(`Staff ${staffId} role updated to ${newRole}`);

  return updated;
};

export const resetStaffPassword = async (
  userId,
  businessId,
  staffId,
  newPassword
) => {
  await assertBusinessOwnership(userId, businessId);

  const staff = await db
    .select()
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .limit(1);

  if (staff.length === 0) {
    throw new Error("Staff member not found");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  const [updated] = await db
    .update(staffMembers)
    .set({ password: hashed })
    .where(
      and(
        eq(staffMembers.id, staffId),
        eq(staffMembers.businessId, businessId)
      )
    )
    .returning({
      id: staffMembers.id,
      name: staffMembers.name,
      email: staffMembers.email,
    });

  logger.info(`Password reset for staff ${staffId}`);


  try {
    const user = { firstName: updated.name, email: updated.email };
    const emailClient = new Email(user, "");
    await emailClient.sendStaffPasswordReset();
  } catch (error) {
    logger.error(`Failed to send password reset email:`, error);
  }

  return updated;
};

export const getStaffStats = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);

  const all = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.businessId, businessId));

  const active = all.filter((s) => s.isActive);

  const sub = await getSubscription(userId);
  const limit = staffLimits[sub.plan] ?? 1;

  return {
    total: all.length,
    active: active.length,
    inactive: all.length - active.length,
    limit,
    remaining: Math.max(0, limit - all.length),
    canAddMore: all.length < limit,
  };
};