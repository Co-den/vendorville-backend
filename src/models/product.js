import { businesses } from "#models/business.js";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),

  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: text("image_url"),

  price: integer("price").notNull(), // stored in kobo
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),

  lowStockAlertSent: boolean("low_stock_alert_sent").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
