import * as subscriptionService from "#services/subscriptionService.js";

export const getSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.getSubscription(req.user.id);
    res.status(200).json({ subscription: sub });
  } catch (error) {
    next(error);
  }
};

export const upgradeSubscription = async (req, res, next) => {
  try {
    const { plan, reference } = req.body;
    if (!plan || !reference) {
      return res
        .status(400)
        .json({ message: "Plan and payment reference are required" });
    }
    const sub = await subscriptionService.upgradeSubscription(
      req.user.id,
      plan,
      reference,
    );
    res.status(200).json({ subscription: sub });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
