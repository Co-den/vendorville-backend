import { users } from "#models/user.js";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),

  plan: varchar("plan", { length: 20 }).notNull().default("starter"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | expired | cancelled
  renewsAt: timestamp("renews_at"),

  paystackAuthorizationCode: varchar("paystack_authorization_code", {
    length: 100,
  }), // for future auto-charging

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
