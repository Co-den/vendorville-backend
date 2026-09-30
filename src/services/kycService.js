import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import { eq } from "drizzle-orm";

export const saveIdentity = async ({
    userId,
    identityType,
    identityNumber,
}) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        if (!["bvn", "nin"].includes(identityType)) {
            throw new Error("Identity type must be BVN or NIN");
        }

        if (!identityNumber) {
            throw new Error("Identity number is required");
        }

        const [user] = await db
            .select({
                id: users.id,
                identityType: users.identityType,
                identityNumber: users.identityNumber,
                identityVerified: users.identityVerified,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.identityVerified) {
            throw new Error("Identity is already verified");
        }

        const [updatedUser] = await db
            .update(users)
            .set({
                identityType,
                identityNumber,
                identityVerified: true,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                identityType: users.identityType,
                identityVerified: users.identityVerified,
            });

        logger.info(
            `Identity information saved for user ${userId}: ${identityType}`
        );

        return updatedUser;
    } catch (error) {
        logger.error(`KYC save identity error: ${error.message}`);
        throw error;
    }
};