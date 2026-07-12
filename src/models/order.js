import { businesses } from "#models/business.js";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),

  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 150 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerEmail: varchar("customer_email", { length: 255 }),

  totalAmount: integer("total_amount").notNull(), // kobo
  paymentMethod: varchar("payment_method", { length: 20 })
    .notNull()
    .default("cash"), // cash | card | transfer | wallet
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid | fulfilled | cancelled

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id"),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
