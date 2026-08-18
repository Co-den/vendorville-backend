import * as dispatchController from "#controllers/dispatchController.js";
import express from "express";

const router = express.Router();
router.get("/:token", dispatchController.getDispatchByToken);
router.post("/:token/location", dispatchController.updateRiderLocation);

export default router;
