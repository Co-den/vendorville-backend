import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import Email, { generateVerificationCode } from "#utils/email.js";

import bcrypt from "bcrypt";
import crypto from "crypto";
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
    try {
      new Email(newUser)
        .sendVerificationCode(verificationCode)
        .catch((err) => logger.error("Verification email failed", err));
    } catch (emailError) {
      logger.error(
        `Signup succeeded but verification email failed for ${newUser.email}`,
        emailError,
      );
    }

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

    try {
      await new Email(updatedUser).sendWelcome();
    } catch (emailError) {
      logger.error(`Welcome email failed for ${updatedUser.email}`, emailError);
    }

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

    new Email(user).sendVerificationCode(verificationCode);

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

// change password
export const changePassword = async (userId, currentPassword, newPassword) => {
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userResult.length === 0) throw new Error("User not found");
  const user = userResult[0];

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("Current password is incorrect");

  if (newPassword.length < 8)
    throw new Error("New password must be at least 8 characters");

  const hashed = await hashpassword(newPassword);

  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { message: "Password updated successfully" };
};

export const forgotPassword = async (email) => {
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (userResult.length === 0) {
    // Don't reveal whether the email exists respond success regardless
    return { message: "If that email exists, a reset link has been sent." };
  }
  const user = userResult[0];

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db
    .update(users)
    .set({ resetPasswordToken: hashedToken, resetPasswordExpires: expires })
    .where(eq(users.id, user.id));

  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${rawToken}`;

  try {
    await new Email(user, resetUrl).sendPasswordReset();
  } catch (error) {
    // Roll back the token if email fails, so a stale unusable token doesn't linger
    await db
      .update(users)
      .set({ resetPasswordToken: null, resetPasswordExpires: null })
      .where(eq(users.id, user.id));
    throw new Error("Could not send reset email. Please try again.");
  }

  return { message: "If that email exists, a reset link has been sent." };
};

export const resetPassword = async (rawToken, newPassword) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.resetPasswordToken, hashedToken))
    .limit(1);
  if (userResult.length === 0) {
    throw new Error("Invalid or expired reset token");
  }
  const user = userResult[0];

  if (
    !user.resetPasswordExpires ||
    new Date() > new Date(user.resetPasswordExpires)
  ) {
    throw new Error("Reset token has expired. Please request a new one.");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const hashedPassword = await hashpassword(newPassword);

  await db
    .update(users)
    .set({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { message: "Password reset successfully. You can now log in." };
};

export const emailExists = async (email) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0;
};
