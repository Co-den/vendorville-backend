import * as businessController from "#controllers/businessController.js";
import * as staffController from "#controllers/staffController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import securityMiddleware from "#middlewares/security.js";
import { upload } from "#middlewares/upload.js";
import express from "express";

const router = express.Router();
router.use(authMiddleware);
router.use(securityMiddleware);

router.get("/", businessController.getBusinesses);

router.post(
  "/",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "premisesImages", maxCount: 5 },
  ]),
  businessController.createBusiness,
);

router.delete("/:id", businessController.deleteBusiness);
router.patch("/:id/availability", businessController.updateAvailability);

router.get("/:id/reviews", businessController.getReviews);
router.post("/:id/reviews/:reviewId/reply", businessController.replyToReview);

//staff

router.get("/:id/staff", staffController.getStaff);
router.post("/:id/staff", staffController.inviteStaff);
router.delete("/:id/staff/:staffId", staffController.removeStaff);
router.patch("/:id/staff/:staffId/active", staffController.toggleStaffActive);

router.post("/:id/ai-order", businessController.parseAiOrder);

export default router;
