import logger from "#config/logger.js";
import {
    createUser,
    deleteUser,
    getAllUser,
    getUserById,
    updateUser,
} from "#services/userService.js";
import formValidationErrors from "#utils/format.js";
import { userIdSchema } from "#validations/user.validation.js";

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info("Fetching all users");

    const allUsers = await getAllUser();
    res.status(200).json({
      message: "Users fetched successfully",
      user: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    logger.error(`Error in getAllUsers controller: ${error.message}`);
    next(error);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    logger.info(`Fetching user with id: ${req.params.id}`);
    // validate the user ID parameter
    const validateResult = userIdSchema.safeParse({ id: req.params.id });
    if (!validateResult.success) {
      return res.status(400).json({
        message: "Invalid user ID parameter",
        errors: formValidationErrors(validateResult.error),
      });
    }

    const { id } = validateResult.data;

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check authorization: admin can view any profile, users can only view their own
    if (req.user.role !== "admin" && req.user.id !== id) {
      logger.warn("Unauthorized access attempt", {
        userId: req.user.id,
        targetUserId: id,
        userRole: req.user.role,
      });
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only access your own profile.",
      });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    logger.error(`Error in fetchUserById controller: ${error.message}`);
    next(error);
  }
};

export const createNewUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    logger.info(`Creating new user with email: ${email}`);

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Missing required fields: name, email, password",
      });
    }

    const newUser = await createUser({
      name,
      email,
      password,
      role: role || "user",
    });

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    logger.error(`Error in createNewUser controller: ${error.message}`);
    next(error);
  }
};

export const updateUserData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.info(`Updating user with id: ${id}`);

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check authorization: admin can update any profile, users can only update their own
    if (req.user.role !== "admin" && req.user.id !== Number(id)) {
      logger.warn("Unauthorized update attempt", {
        userId: req.user.id,
        targetUserId: id,
        userRole: req.user.role,
      });
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only update your own profile.",
      });
    }

    // Prevent updating password directly (should use separate endpoint)
    if (updateData.password) {
      return res.status(400).json({
        message: "Cannot update password via this endpoint",
      });
    }

    // Prevent non-admin users from changing their role
    if (updateData.role && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "You cannot change your own role.",
      });
    }

    const updatedUser = await updateUser(id, updateData);

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Error in updateUserData controller: ${error.message}`);
    next(error);
  }
};

export const deleteUserData = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting user with id: ${id}`);

    // Check if user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const deletedUser = await deleteUser(id);

    res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    logger.error(`Error in deleteUserData controller: ${error.message}`);
    next(error);
  }
};