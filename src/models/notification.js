// #models/notification.js
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  channel: varchar("channel", { length: 20 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  event: varchar("event", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
