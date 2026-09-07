import * as analyticsService from "#services/analyticsService.js";

export const getOrdersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    const orders = await analyticsService.getOrdersByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate,
    );

    res.status(200).json({ orders });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    const transactions = await analyticsService.getTransactionsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate,
    );

    res.status(200).json({ transactions });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    const stats = await analyticsService.getOrderStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate,
    );

    res.status(200).json({ stats });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    const stats = await analyticsService.getTransactionStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate,
    );

    res.status(200).json({ stats });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.params.id;

    const stats = await analyticsService.getStatsByDateRange(
      req.user.id,
      businessId,
      startDate,
      endDate,
    );

    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
