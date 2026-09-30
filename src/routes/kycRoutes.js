import express from "express";
import { submitIdentity } from "#controllers/kycController.js";
import authMiddleware from "#middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);


router.post("/identity", submitIdentity);

export default router;