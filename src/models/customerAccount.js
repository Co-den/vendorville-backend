import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const customerAccounts = pgTable("customer_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
