import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

// Hash the password before saving it to the database
export const hashpassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    logger.error("Hashing password error", error);
    throw new Error("Error hashing password");
  }
};

// Create a new user in the database
export const createUser = async ({
  firstName,
  lastName,
  email,
  password,
  phoneNumber,
  businessName,
  businessType,
  country,
  timeZone,
  state,
  city,
  businessAddress,
  postalCode,
  pin,
  role = "user",
}) => {
  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) throw new Error("User already exist");

    const password_hashed = await hashpassword(password);
    const hashedPin = await hashpassword(pin);
    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        password: password_hashed,
        phoneNumber,
        businessName,
        businessType,
        country,
        timeZone,
        state,
        city,
        businessAddress,
        postalCode,
        pin: hashedPin,
        role,
      })
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        businessName: users.businessName,
        businessType: users.businessType,
        country: users.country,
        timeZone: users.timeZone,
        state: users.state,
        city: users.city,
        businessAddress: users.businessAddress,
        postalCode: users.postalCode,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    logger.info(`User ${newUser.email} created successfully`);
    return newUser;
  }
    /*catch (error) {
    logger.error(`Error creating the user:${error}`);
    throw new Error("Error creating the user");
  }*/
   catch (error) {
  console.error(error);
  throw error;
}
  };

// Verify user credentials and return user data
export const verifyCredentials = async (email, password, pin) => {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = userResult[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    const isPinValid = await bcrypt.compare(pin, user.pin);

    if (!isPasswordValid || !isPinValid) {
      throw new Error("Invalid email or password");
    }

    logger.info(`User ${email} authenticated successfully`);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    logger.warn(`Authentication failed for email: ${email}`, {
      error: error.message,
    });
    throw error;
  }
};
