import { users } from "#models/user.js";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),

  balance: integer("balance").notNull().default(0),

  paystackCustomerCode: varchar("paystack_customer_code", { length: 100 }),
  dvaAccountNumber: varchar("dva_account_number", { length: 20 }),
  dvaBankName: varchar("dva_bank_name", { length: 100 }),
  dvaAccountName: varchar("dva_account_name", { length: 150 }),
  dvaId: varchar("dva_id", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id")
    .notNull()
    .references(() => wallets.id),

  type: varchar("type", { length: 10 }).notNull(), // "credit" | "debit"
  amount: integer("amount").notNull(), // kobo
  description: text("description").notNull(),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | paid | failed

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),

  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 20 }).notNull(),
  accountName: varchar("account_name", { length: 150 }).notNull(),
  recipientCode: varchar("recipient_code", { length: 100 }).notNull(), // Paystack transfer recipient code
  isPrimary: boolean("is_primary").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
