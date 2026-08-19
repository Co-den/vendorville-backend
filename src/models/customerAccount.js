import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { businesses } from "./business.js";

export const customerAccounts = pgTable("customer_accounts", {
  id: serial("id").primaryKey(),

  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 150 }).notNull(),

  email: varchar("email", { length: 255 }),

  phone: varchar("phone", { length: 20 }).notNull(),

  password: varchar("password", { length: 255 }),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
