import * as customerController from "#controllers/customerController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import express from "express";

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.get("/", customerController.getCustomers);
router.post("/notes", customerController.saveNote);

export default router;
