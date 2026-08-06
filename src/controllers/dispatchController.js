import * as dispatchService from "#services/dispatchService.js";

export const getRiders = async (req, res) => {
  try {
    const riders = await dispatchService.getRiders(req.user.id, req.params.id);
    res.status(200).json({ riders });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addRider = async (req, res) => {
  try {
    const rider = await dispatchService.addRider(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(201).json({ rider });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const removeRider = async (req, res) => {
  try {
    await dispatchService.removeRider(
      req.user.id,
      req.params.id,
      req.params.riderId,
    );
    res.status(200).json({ message: "Rider removed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const toggleRiderActive = async (req, res) => {
  try {
    const rider = await dispatchService.toggleRiderActive(
      req.user.id,
      req.params.id,
      req.params.riderId,
      req.body.isActive,
    );
    res.status(200).json({ rider });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const assignRider = async (req, res) => {
  try {
    const dispatch = await dispatchService.assignRiderToOrder(
      req.user.id,
      req.params.id,
      req.params.orderId,
      req.body.riderId,
    );
    res.status(200).json({ dispatch });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDispatchStatus = async (req, res) => {
  try {
    const dispatch = await dispatchService.updateDispatchStatus(
      req.user.id,
      req.params.id,
      req.params.orderId,
      req.body.status,
    );
    res.status(200).json({ dispatch });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
