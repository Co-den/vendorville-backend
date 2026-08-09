import * as adminController from "#controllers/adminController.js";
import * as chatController from "#controllers/chatController.js";
import { adminAuth } from "#middlewares/adminAuth.js";
import { authLimiter } from "#middlewares/rateLimiters.js";
import express from "express";

const router = express.Router();

router.post("/login", authLimiter, adminController.loginAdmin);
router.post("/logout", adminController.logoutAdmin);

router.get(
  "/businesses/pending",
  adminAuth,
  adminController.getPendingBusinesses,
);
router.get("/businesses", adminAuth, adminController.getAllBusinesses);
router.post(
  "/businesses/:id/approve",
  adminAuth,
  adminController.approveBusiness,
);
router.post(
  "/businesses/:id/reject",
  adminAuth,
  adminController.rejectBusiness,
);
router.get("/stats", adminAuth, adminController.getStats);

router.get("/chat/threads", adminAuth, chatController.getAllThreads);
router.get(
  "/chat/threads/:threadId/messages",
  adminAuth,
  chatController.getThreadMessages,
);
router.post(
  "/chat/threads/:threadId/messages",
  adminAuth,
  chatController.sendAdminMessage,
);

export default router;
