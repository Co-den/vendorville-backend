import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import {
    createUserSchema,
    updateUserSchema,
    userIdSchema,
} from "#validations/user.validation.js";
import { eq } from "drizzle-orm";

const selectUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

export const getAllUser = async () => {
  try {
    return await db.select(selectUserFields).from(users).execute();
  } catch (error) {
    logger.error(`Error fetching all users: ${error.message}`);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const { id } = userIdSchema.parse({ id: Number(userId) });
    const user = await db
      .select(selectUserFields)
      .from(users)
      .where(eq(users.id, id));
    return user[0] || null;
  } catch (error) {
    logger.error(`Error fetching user by id ${userId}: ${error.message}`);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const validatedUserData = createUserSchema.parse(userData);
    const result = await db
      .insert(users)
      .values(validatedUserData)
      .returning(selectUserFields);
    return result[0];
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const { id } = userIdSchema.parse({ id: Number(userId) });
    const validatedUserData = updateUserSchema.parse(userData);

    if (Object.keys(validatedUserData).length === 0) {
      throw new Error("At least one valid field is required to update user");
    }
    const result = await db
      .update(users)
      .set({
        ...validatedUserData,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning(selectUserFields);
    return result[0] || null;
  } catch (error) {
    logger.error(`Error updating user ${userId}: ${error.message}`);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const { id } = userIdSchema.parse({ id: Number(userId) });
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning(selectUserFields);
    return result[0] || null;
  } catch (error) {
    logger.error(`Error deleting user ${userId}: ${error.message}`);
    throw error;
  }
};