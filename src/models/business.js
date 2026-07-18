import { users } from "#models/user.js";
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),

  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 100 }),
  logoUrl: text("logo_url"),

  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  businessEmail: varchar("business_email", { length: 255 }),
  website: varchar("website", { length: 255 }),

  facebook: varchar("facebook", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  tiktok: varchar("tiktok", { length: 255 }),
  telegram: varchar("telegram", { length: 255 }),

  startedDate: varchar("started_date", { length: 20 }),
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"),
  address: varchar("address", { length: 500 }).notNull(),
  description: text("description"),

  isVerified: boolean("is_verified").notNull().default(false),
  slug: varchar("slug", { length: 255 }).notNull().unique(),

  isAvailable: boolean("is_available").notNull().default(true),
  availableDays: text("available_days")
    .array()
    .notNull()
    .default(sql`ARRAY['Mon','Tue','Wed','Thu','Fri','Sat']`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessImages = pgTable("business_images", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
