import * as staffController from "#controllers/staffController.js";
import express from "express";

const router = express.Router();
router.post("/login", staffController.loginStaff);

export default router;
