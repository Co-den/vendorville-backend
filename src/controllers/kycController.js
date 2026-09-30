import logger from "#config/logger.js";
import { saveIdentity } from "#services/kycService.js";

export const submitIdentity = async (req, res) => {
    try {
        const userId = req.user.id;

        const { identityType, identityNumber } = req.body;

        const result = await saveIdentity({
            userId,
            identityType,
            identityNumber,
        });

        return res.status(200).json({
            success: true,
            message: "Identity information saved successfully",
            data: result,
        });
    } catch (error) {
        logger.error(`Submit identity controller error: ${error.message}`);

        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};