import * as businessController from "#controllers/businessController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import { upload } from "#middlewares/upload.js";
import express from "express";

const router = express.Router();
router.use(authMiddleware);

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

export default router;
