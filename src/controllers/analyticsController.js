import * as analyticsService from "#services/analyticsService.js";
import logger from "#config/logger.js";

export const getOrdersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const orders = await analyticsService.getOrdersByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate
    );

    res.status(200).json({ orders });
  } catch (error) {
    logger.error("Error in getOrdersByDateRange:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const transactions = await analyticsService.getTransactionsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate
    );

    res.status(200).json({ transactions });
  } catch (error) {
    logger.error("Error in getTransactionsByDateRange:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const stats = await analyticsService.getOrderStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate
    );

    res.status(200).json({ stats });
  } catch (error) {
    logger.error("Error in getOrderStats:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const stats = await analyticsService.getTransactionStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate
    );

    res.status(200).json({ stats });
  } catch (error) {
    logger.error("Error in getTransactionStats:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const stats = await analyticsService.getStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate
    );

    res.status(200).json(stats);
  } catch (error) {
    logger.error("Error in getStats:", error);
    res.status(400).json({ message: error.message });
  }
};