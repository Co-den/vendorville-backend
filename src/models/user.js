import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 100 }).notNull(),

  lastName: varchar("last_name", { length: 100 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  password: varchar("password", { length: 255 }).notNull(),

  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),

  businessName: varchar("business_name", {
    length: 255,
  }).notNull(),

  businessType: varchar("business_type", {
    length: 100,
  }).notNull(),

  country: varchar("country", {
    length: 100,
  }).notNull(),

  timeZone: varchar("time_zone", {
    length: 100,
  }).notNull(),

  state: varchar("state", {
    length: 100,
  }).notNull(),

  city: varchar("city", {
    length: 100,
  }).notNull(),

  businessAddress: varchar("business_address", {
    length: 255,
  }).notNull(),

  postalCode: varchar("postal_code", {
    length: 20,
  }),

  pin: varchar("pin", {
    length: 255,
  }).notNull(),

  role: varchar("role", {
    length: 50,
  }).notNull(),

  isVerified: boolean("is_verified").default(false).notNull(),

  verificationCode: varchar("verification_code", { length: 10 }),

  verificationCodeExpiresAt: timestamp("verification_code_expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
