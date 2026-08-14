// #controllers/pushController.js
import * as pushService from "#services/pushService.js";

export const subscribe = async (req, res) => {
  try {
    const userType = req.user ? "vendor" : req.staff ? "staff" : "admin";
    const userId = req.user?.id || req.staff?.id || req.admin?.id;
    await pushService.saveSubscription(userId, userType, req.body.subscription);
    res.status(201).json({ message: "Subscribed to push notifications" });
  } catch (error) {
    res.status(400).json({ message: "Could not subscribe" });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    await pushService.removeSubscription(req.body.endpoint);
    res.status(200).json({ message: "Unsubscribed" });
  } catch (error) {
    res.status(400).json({ message: "Could not unsubscribe" });
  }
};

export const getVapidPublicKey = async (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};
