import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name cannot exceed 100 characters")
    .trim(),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name cannot exceed 100 characters")
    .trim(),

  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email cannot exceed 255 characters")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(255, "Password cannot exceed 255 characters"),

  phoneNumber: z
    .string()
    .min(10, "Phone number is required")
    .max(20, "Phone number cannot exceed 20 characters")
    .trim(),

  businessName: z
    .string()
    .min(2, "Business name is required")
    .max(255, "Business name cannot exceed 255 characters")
    .trim(),

  businessType: z
    .string()
    .min(2, "Business type is required")
    .max(100)
    .trim(),

  country: z
    .string()
    .min(2, "Country is required")
    .max(100)
    .trim(),

  timeZone: z
    .string()
    .min(2, "Time zone is required")
    .max(100)
    .trim(),

  state: z
    .string()
    .min(2, "State is required")
    .max(100)
    .trim(),

  city: z
    .string()
    .min(2, "City is required")
    .max(100)
    .trim(),

  businessAddress: z
    .string()
    .min(5, "Business address is required")
    .max(255)
    .trim(),

  postalCode: z
    .string()
    .max(20)
    .trim()
    .optional(),

  pin: z
    .string()
    .length(4, "PIN must be exactly 4 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),

  role: z.enum(["vendor", "admin"]).default("vendor").optional(),
});

export const updateUserSchema = createUserSchema.partial().strict();

export const userIdSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("User ID must be a positive integer"),
});