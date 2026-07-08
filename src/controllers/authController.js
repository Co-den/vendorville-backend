import logger from "#config/logger.js";
import { createUser, verifyCredentials } from "#services/authService.js";
import { cookies } from "#utils/cookies.js";
import formatValidationError from "#utils/format.js";
import { jwtSign } from "#utils/jwt.js";
import { signinSchema, signupSchema } from "#validations/auth.validation.js";

export const signup = async (req, res, next) => {
  try {
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input data",
        errors: validationResult.error.issues,
        details: formatValidationError(validationResult.error),
      });
    }
    const {
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
      role,
    } = validationResult.data;

    //AUTH SERVICE
    const user = await createUser({
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
      role,
    });

    const token = jwtSign.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.setCookie(res, "token", token);
    logger.info(`User ${email} signed up successfully`);
    res.status(201).json({
      message: "User signed up successfully",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        businessName: user.businessName,
        businessType: user.businessType,
        country: user.country,
        timeZone: user.timeZone,
        state: user.state,
        city: user.city,
        businessAddress: user.businessAddress,
        postalCode: user.postalCode
      },
    });
  } catch (error) {
    logger.error("Signup error", error);
    if (error.message === "User already exist") {
      return res.status(409).json({ message: "User already exists" });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validationResult = signinSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid input data",
        errors: validationResult.error.issues,
        details: formatValidationError(validationResult.error),
      });
    }

    const { email, password, pin } = validationResult.data;

    const user = await verifyCredentials(email, password, pin);

    const token = jwtSign.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.setCookie(res, "token", token);
    logger.info(`User ${email} logged in successfully`);

    res.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.warn("Login error", { email: req.body.email, error: error.message });

    if (error.message === "Invalid email or password") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    cookies.clearCookie(res, "token");
    logger.info("User logged out successfully");

    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error", error);
    next(error);
  }
};
