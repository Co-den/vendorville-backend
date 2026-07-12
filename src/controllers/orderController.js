import * as orderService from "#services/orderService.js";

export const getOrders = async (req, res, next) => {
  try {
    const list = await orderService.getOrders(
      req.user.id,
      req.params.businessId,
    );
    res.status(200).json({ orders: list });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(
      req.user.id,
      req.params.businessId,
      req.body,
    );
    res.status(201).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const result = await orderService.updateOrderStatus(
      req.user.id,
      req.params.businessId,
      req.params.orderId,
      req.body.status,
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res, next) => {
  try {
    await orderService.deleteOrder(
      req.user.id,
      req.params.businessId,
      req.params.orderId,
    );
    res.status(200).json({ message: "Order deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
