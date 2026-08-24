import * as pushService from "#services/pushService.js";

export const subscribe = async (req, res) => {
  try {
    let userId;
    let userType;

    if (req.user) {
      userId = req.user.id;
      userType = "vendor";
    } else if (req.customer) {
      userId = req.customer.id;
      userType = "customer";
    } else if (req.staff) {
      userId = req.staff.id;
      userType = "staff";
    } else if (req.admin) {
      userId = req.admin.id;
      userType = "admin";
    } else {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!req.body.subscription?.endpoint) {
      return res.status(400).json({
        message: "Invalid push subscription",
      });
    }

    await pushService.saveSubscription(userId, userType, req.body.subscription);

    res.status(201).json({
      message: "Subscribed to push notifications",
    });
  } catch (error) {
    console.error("Push subscription error:", error);

    res.status(400).json({
      message: "Could not subscribe",
    });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    if (!req.body.endpoint) {
      return res.status(400).json({
        message: "Endpoint is required",
      });
    }

    await pushService.removeSubscription(req.body.endpoint);

    res.status(200).json({
      message: "Unsubscribed",
    });
  } catch (error) {
    console.error("Push unsubscribe error:", error);

    res.status(400).json({
      message: "Could not unsubscribe",
    });
  }
};

export const getVapidPublicKey = async (req, res) => {
  res.status(200).json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
};
