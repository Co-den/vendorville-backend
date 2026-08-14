import * as businessController from "#controllers/businessController.js";
import * as dispatchController from "#controllers/dispatchController.js";
import * as loyaltyController from "#controllers/loyaltyController.js";
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

router.post(
  "/:id/ai-order",
  ownerOnly,
  restrictToOwnBusiness,
  aiLimiter,
  businessController.parseAiOrder,
);

router.post(
  "/:id/gift-cards",
  ownerOnly,
  restrictToOwnBusiness,
  loyaltyController.issueGiftCard,
);
router.get(
  "/:id/gift-cards",
  ownerOnly,
  restrictToOwnBusiness,
  loyaltyController.getGiftCards,
);

router.get(
  "/:id/riders",
  ownerOnly,
  restrictToOwnBusiness,
  dispatchController.getRiders,
);
router.post(
  "/:id/riders",
  ownerOnly,
  restrictToOwnBusiness,
  dispatchController.addRider,
);
router.delete(
  "/:id/riders/:riderId",
  ownerOnly,
  restrictToOwnBusiness,
  dispatchController.removeRider,
);
router.patch(
  "/:id/riders/:riderId/active",
  ownerOnly,
  restrictToOwnBusiness,
  dispatchController.toggleRiderActive,
);

router.post(
  "/:id/orders/:orderId/assign-rider",
  managerOrOwner,
  restrictToOwnBusiness,
  dispatchController.assignRider,
);
router.patch(
  "/:id/orders/:orderId/dispatch-status",
  managerOrOwner,
  restrictToOwnBusiness,
  dispatchController.updateDispatchStatus,
);

router.get(
  "/:id/export/orders",
  ownerOnly,
  restrictToOwnBusiness,
  businessController.exportOrdersCsv,
);
export default router;
