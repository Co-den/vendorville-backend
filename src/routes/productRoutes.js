import * as productController from "#controllers/productController.js";
//import authMiddleware from "#middlewares/authMiddleware.js";
import {
  flexibleAuth,
  restrictToOwnBusiness,
} from "#middlewares/flexibleAuth.js";
import { dashboardWriteLimiter } from "#middlewares/rateLimiters.js";

//import securityMiddleware from "#middlewares/security.js";
import { upload } from "#middlewares/upload.js";
import express from "express";

// needed to access :businessId from parent mount
const router = express.Router({ mergeParams: true });
//router.use(authMiddleware);
router.use(flexibleAuth);
router.use(restrictToOwnBusiness);
//router.use(securityMiddleware);

router.get("/", productController.getProducts);
router.post(
  "/",
  dashboardWriteLimiter,
  upload.single("image"),
  productController.createProduct,
);
router.patch(
  "/:productId",
  dashboardWriteLimiter,
  upload.single("image"),
  productController.updateProduct,
);
router.delete(
  "/:productId",
  dashboardWriteLimiter,
  productController.deleteProduct,
);

export default router;
