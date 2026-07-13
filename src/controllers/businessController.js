/*import logger from "#config/logger.js";
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
*/
import logger from "#config/logger.js";
import * as businessService from "#services/businessService.js";

export const getBusinesses = async (req, res, next) => {
  try {
    const list = await businessService.getUserBusinesses(req.user.id);
    res.status(200).json({ businesses: list });
  } catch (error) {
    console.error("GET BUSINESSES ERROR:", error);
    next(error);
  }
};

export const createBusiness = async (req, res) => {
  try {
    console.log("========== CREATE BUSINESS REQUEST ==========");
    console.log("User:", req.user);

    console.log("Body:");
    console.log(req.body);

    console.log("Files:");
    console.log(req.files);

    const business = await businessService.createBusiness(
      req.user.id,
      req.body,
      req.files,
    );

    console.log("Business created successfully:");
    console.log(business);

    return res.status(201).json({ business });
  } catch (error) {
    console.error("========== CREATE BUSINESS ERROR ==========");
    console.error(error);

    if (error.stack) {
      console.error(error.stack);
    }

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

    logger.error("Create business error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create business",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    await businessService.deleteBusiness(req.user.id, req.params.id);

    return res.status(200).json({
      message: "Business deleted",
    });
  } catch (error) {
    console.error("========== DELETE BUSINESS ERROR ==========");
    console.error(error);

    logger.error("Delete business error:", error);

    return res.status(400).json({
      message: error.message,
    });
  }
};
