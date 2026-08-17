import { db } from "#config/database.js";
import { businesses } from "#models/business.js";
import { deliveryZones } from "#models/deliveryZone.js";
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
};

export const getZones = async (businessId) => {
  const zones = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.businessId, businessId));
  return zones.map((z) => ({ ...z, fee: z.fee / 100 }));
};

export const getZonesForVendor = async (userId, businessId) => {
  await assertBusinessOwnership(userId, businessId);
  return getZones(businessId);
};

export const addZone = async (userId, businessId, { name, fee }) => {
  await assertBusinessOwnership(userId, businessId);
  if (!name || fee === undefined || fee < 0)
    throw new Error("Zone name and a valid fee are required");

  const [zone] = await db
    .insert(deliveryZones)
    .values({ businessId, name, fee: Math.round(fee * 100) })
    .returning();

  return { ...zone, fee: zone.fee / 100 };
};

export const updateZone = async (userId, businessId, zoneId, { name, fee }) => {
  await assertBusinessOwnership(userId, businessId);

  const [updated] = await db
    .update(deliveryZones)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(fee !== undefined ? { fee: Math.round(fee * 100) } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deliveryZones.id, zoneId),
        eq(deliveryZones.businessId, businessId),
      ),
    )
    .returning();

  if (!updated) throw new Error("Zone not found");
  return { ...updated, fee: updated.fee / 100 };
};

export const deleteZone = async (userId, businessId, zoneId) => {
  await assertBusinessOwnership(userId, businessId);
  await db
    .delete(deliveryZones)
    .where(
      and(
        eq(deliveryZones.id, zoneId),
        eq(deliveryZones.businessId, businessId),
      ),
    );
};

export const resolveZoneFee = async (businessId, deliveryZoneId) => {
  if (!deliveryZoneId) return { deliveryZoneId: null, feeKobo: 0 };

  const result = await db
    .select()
    .from(deliveryZones)
    .where(
      and(
        eq(deliveryZones.id, deliveryZoneId),
        eq(deliveryZones.businessId, businessId),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error("Invalid delivery zone for this store");
  }

  return { deliveryZoneId: result[0].id, feeKobo: result[0].fee };
};
