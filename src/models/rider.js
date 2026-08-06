import { businesses } from "#models/business.js";
import { orders } from "#models/order.js";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const riders = pgTable("riders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),

  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderDispatch = pgTable("order_dispatch", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id)
    .unique(),
  riderId: integer("rider_id")
    .notNull()
    .references(() => riders.id),

  status: varchar("status", { length: 20 }).notNull().default("assigned"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
});
