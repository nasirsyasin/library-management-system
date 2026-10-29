import { pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const accountRole = pgEnum("account_role", ["member", "librarian"]);
export const accountStatus = pgEnum("account_status", ["pending", "approved", "rejected"]);

export const accounts = pgTable(
  "identity_account",
  {
    memberId: uuid("member_id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: varchar("password_hash", { length: 256 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    address: varchar("address", { length: 500 }),
    role: accountRole("role").notNull().default("member"),
    status: accountStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("identity_account_email_uq").on(table.email)],
);
