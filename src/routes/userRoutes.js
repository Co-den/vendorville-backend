import {
    createNewUser,
    deleteUserData,
    fetchAllUsers,
    fetchUserById,
    updateUserData,
} from "#controllers/userController.js";
import authMiddleware from "#middlewares/authMiddleware.js";
import rbacMiddleware from "#middlewares/rbacMiddleware.js";
import express from "express";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Admin only: fetch all users
router.get("/", rbacMiddleware(["admin"]), fetchAllUsers);

// Admin only: create new user
router.post("/", rbacMiddleware(["admin"]), createNewUser);

// Authenticated users can fetch their own profile, admins can fetch any profile
router.get("/:id", fetchUserById);

// Users can update their own profile, admins can update any profile
router.put("/:id", updateUserData);

// Admin only: delete users
router.delete("/:id", rbacMiddleware(["admin"]), deleteUserData);

export default router;