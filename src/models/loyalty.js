// #models/loyalty.js
import { businesses } from "#models/business.js";
import { customerAccounts } from "#models/customerAccount.js";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const loyaltyPoints = pgTable("loyalty_points", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  customerAccountId: integer("customer_account_id")
    .notNull()
    .references(() => customerAccounts.id),
  points: integer("points").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  customerAccountId: integer("customer_account_id")
    .notNull()
    .references(() => customerAccounts.id),
  orderId: integer("order_id"),
  points: integer("points").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  code: varchar("code", { length: 20 }).notNull().unique(),
  initialValue: integer("initial_value").notNull(), // kobo
  remainingValue: integer("remaining_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
