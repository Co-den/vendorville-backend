import logger from "#config/logger.js";
import * as businessService from "#services/businessService.js";

export const getBusinesses = async (req, res, next) => {
  try {
    const list = await businessService.getUserBusinesses(req.user.id);
    res.status(200).json({ businesses: list });
  } catch (error) {
    next(error);
  }
};

export const createBusiness = async (req, res, next) => {
  try {
    const business = await businessService.createBusiness(
      req.user.id,
      req.body,
      req.files,
    );
    res.status(201).json({ business });
  } catch (error) {
    if (error.message === "BUSINESS_LIMIT_REACHED") {
      return res.status(403).json({
        message:
          "You've reached your business limit for your current plan. Upgrade to add more.",
        code: "BUSINESS_LIMIT_REACHED",
      });
    }
    if (error.message === "SUBSCRIPTION_INACTIVE") {
      return res.status(403).json({
        message: "Your subscription has expired. Renew your plan to continue.",
        code: "SUBSCRIPTION_INACTIVE",
      });
    }
    logger.error("Create business error", error);
    res.status(500).json({ message: "Failed to create business" });
  }
};

export const deleteBusiness = async (req, res, next) => {
  try {
    await businessService.deleteBusiness(req.user.id, req.params.id);
    res.status(200).json({ message: "Business deleted" });
  } catch (error) {
    logger.error("Delete business error", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const business = await businessService.updateAvailability(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({ business });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
