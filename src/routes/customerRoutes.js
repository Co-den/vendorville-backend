import * as customerController from "#controllers/customerController.js";
//import authMiddleware from "#middlewares/authMiddleware.js";
import {
  flexibleAuth,
  managerOrOwner,
  restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js";
import securityMiddleware from "#middlewares/security.js";
import express from "express";

const router = express.Router({ mergeParams: true });
//router.use(authMiddleware);
router.use(securityMiddleware);
router.use(flexibleAuth);
router.use(restrictToOwnBusiness);
router.use(managerOrOwner);

router.get("/", customerController.getCustomers);
router.post("/notes", customerController.saveNote);

export default router;
