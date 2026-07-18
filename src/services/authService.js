import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import {
  generateVerificationCode,
  sendVerificationEmail,
} from "#utils/verification.js";
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
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

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
        verificationCode,
        verificationCodeExpiresAt,
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
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    // Fire-and-forget don't block the signup response on email sending
    sendVerificationEmail(newUser.email, newUser.firstName, verificationCode)
      .then(() => {
        logger.info(`Verification email sent to ${newUser.email}`);
      })
      .catch((emailError) => {
        logger.error(
          `Signup succeeded but verification email failed for ${newUser.email}`,
          emailError,
        );
      });

    logger.info(`User ${newUser.email} created successfully`);
    return newUser;
  } catch (error) {
    logger.error(`Error creating the user:${error}`);
    throw new Error("Error creating the user");
  }
};

// Verify the code sent to user's email and mark account as verified
export const verifyEmailCode = async (email, code) => {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error("Invalid email or verification code");
    }

    const user = userResult[0];

    if (user.isVerified) {
      throw new Error("Email is already verified");
    }

    if (user.verificationCode !== code) {
      throw new Error("Invalid email or verification code");
    }

    if (
      user.verificationCodeExpiresAt &&
      new Date() > new Date(user.verificationCodeExpiresAt)
    ) {
      throw new Error("Verification code has expired");
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        updatedAt: users.updatedAt,
      });

    logger.info(`User ${updatedUser.email} verified successfully`);
    return updatedUser;
  } catch (error) {
    logger.warn(`Email verification failed for ${email}`, {
      error: error.message,
    });
    throw error;
  }
};

// Resend a new verification code to the user
export const resendVerificationCode = async (email) => {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error("User not found");
    }

    const user = userResult[0];

    if (user.isVerified) {
      throw new Error("Email is already verified");
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db
      .update(users)
      .set({
        verificationCode,
        verificationCodeExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    await sendVerificationEmail(user.email, user.firstName, verificationCode);

    logger.info(`Verification code resent to ${user.email}`);
    return { message: "Verification code resent" };
  } catch (error) {
    logger.warn(`Resend verification failed for ${email}`, {
      error: error.message,
    });
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
      firstName: user.firstName,
      timeZone: user.timeZone,
    };
  } catch (error) {
    logger.warn(`Authentication failed for email: ${email}`, {
      error: error.message,
    });
    throw error;
  }
};
