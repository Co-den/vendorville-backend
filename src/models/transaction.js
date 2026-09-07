import { businesses } from "#models/business.js";
import { users } from "#models/user.js";
import {
  bigint,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paystackReference: varchar("paystack_reference", { length: 100 }),
  paystackAuthCode: varchar("paystack_auth_code", { length: 100 }),
  bankTransferReference: varchar("bank_transfer_reference", { length: 100 }),
  bankAccount: varchar("bank_account", { length: 20 }),
  bankCode: varchar("bank_code", { length: 10 }),
  bankName: varchar("bank_name", { length: 100 }),
  recipientName: varchar("recipient_name", { length: 100 }),
  orderId: integer("order_id"),
  description: text("description"),
  reference: varchar("reference", { length: 100 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
