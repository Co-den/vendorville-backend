import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { businesses, businessImages } from "#models/business.js";
import { getSubscription } from "#services/subscriptionService.js";
import { uploadBufferToCloudinary } from "#utils/uploadToCloudinary.js";
import { eq } from "drizzle-orm";

export const getUserBusinesses = async (userId) => {
  const list = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId));

  const withImages = await Promise.all(
    list.map(async (biz) => {
      const images = await db
        .select()
        .from(businessImages)
        .where(eq(businessImages.businessId, biz.id));
      return { ...biz, premisesImages: images.map((i) => i.imageUrl) };
    }),
  );

  return withImages;
};

export const createBusiness = async (userId, data, files) => {
  const sub = await getSubscription(userId);

  if (sub.status !== "active") {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }

  const existing = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId));
  if (existing.length >= sub.limit) {
    throw new Error("BUSINESS_LIMIT_REACHED");
  }

  let logoUrl = null;
  if (files?.logo?.[0]) {
    logoUrl = await uploadBufferToCloudinary(
      files.logo[0].buffer,
      "vendorhub/logos",
    );
  }

  const [newBusiness] = await db
    .insert(businesses)
    .values({
      userId,
      name: data.name,
      shortName: data.shortName || null,
      logoUrl,
      whatsappNumber: data.whatsappNumber || null,
      businessEmail: data.businessEmail || null,
      website: data.website || null,
      facebook: data.facebook || null,
      instagram: data.instagram || null,
      tiktok: data.tiktok || null,
      telegram: data.telegram || null,
      startedDate: data.startedDate || null,
      visibility: data.visibility || "public",
      address: data.address,
      description: data.description || null,
    })
    .returning();

  if (files?.premisesImages?.length) {
    const uploadedUrls = await Promise.all(
      files.premisesImages.map((file) =>
        uploadBufferToCloudinary(file.buffer, "vendorhub/premises"),
      ),
    );
    await db.insert(businessImages).values(
      uploadedUrls.map((url) => ({
        businessId: newBusiness.id,
        imageUrl: url,
      })),
    );
  }

  logger.info(`Business "${newBusiness.name}" created for user ${userId}`);
  return newBusiness;
};

export const deleteBusiness = async (userId, businessId) => {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (result.length === 0 || result[0].userId !== userId) {
    throw new Error("Business not found");
  }
  await db
    .delete(businessImages)
    .where(eq(businessImages.businessId, businessId));
  await db.delete(businesses).where(eq(businesses.id, businessId));
};
