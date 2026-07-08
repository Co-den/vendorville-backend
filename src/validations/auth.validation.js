import { z } from "zod";

export const signupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string(),
  phoneNumber: z.string(),
  businessName: z.string(),
  businessType: z.string().min(1, "Business type is required"),
  country: z.string(),
  timeZone: z.string(),
  state: z.string(),
  city: z.string(),
  businessAddress: z.string(),
  postalCode: z.string().optional(),
  pin: z.string(),
  role: z.string().default("user"),
});

export const signinSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
  password: z.string().min(1),
  pin: z.string().min(1).max(4).trim(),
});
