import { businesses } from "#models/business.js";
import { orders } from "#models/order.js";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),

  customerName: varchar("customer_name", { length: 150 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  vendorReply: text("vendor_reply"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
