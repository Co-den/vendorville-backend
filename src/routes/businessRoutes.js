import * as businessController from "#controllers/businessController.js";
import * as staffController from "#controllers/staffController.js";
//import authMiddleware from "#middlewares/authMiddleware.js";
import { aiLimiter } from "#src/middlewares/rateLimiters.js";

import {
  flexibleAuth,
  managerOrOwner,
  ownerOnly,
  restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js";
//import securityMiddleware from "#middlewares/security.js";
import { upload } from "#middlewares/upload.js";
import express from "express";

const router = express.Router();
//router.use(authMiddleware);
router.use(flexibleAuth);
//router.use(securityMiddleware);

router.get("/", ownerOnly, businessController.getBusinesses);
router.get(
  "/staff/my-business",
  flexibleAuth,
  businessController.getStaffBusiness,
);

router.post(
  "/",
  ownerOnly,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "premisesImages", maxCount: 5 },
  ]),
  businessController.createBusiness,
);

router.delete("/:id", ownerOnly, businessController.deleteBusiness);
router.patch("/:id/availability", businessController.updateAvailability);

router.get(
  "/:id/staff",
  ownerOnly,
  restrictToOwnBusiness,
  staffController.getStaff,
);
router.post("/:id/staff", ownerOnly, staffController.inviteStaff);
router.delete("/:id/staff/:staffId", ownerOnly, staffController.removeStaff);
router.patch(
  "/:id/staff/:staffId/active",
  ownerOnly,
  staffController.toggleStaffActive,
);

router.patch(
  "/:id/availability",
  ownerOnly,
  businessController.updateAvailability,
);

// Reviews owner or manager can reply
router.get(
  "/:id/reviews",
  restrictToOwnBusiness,
  businessController.getReviews,
);
router.post(
  "/:id/reviews/:reviewId/reply",
  managerOrOwner,
  restrictToOwnBusiness,
  businessController.replyToReview,
);

// AI order entry enterprise + owner only (staff shouldn't trigger billing-adjacent AI calls)
router.post(
  "/:id/ai-order",
  ownerOnly,
  restrictToOwnBusiness,
  aiLimiter,
  businessController.parseAiOrder,
);

export default router;
