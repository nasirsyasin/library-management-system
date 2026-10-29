import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const borrows = pgTable(
  "borrow",
  {
    borrowId: uuid("borrowId").defaultRandom().primaryKey(),
    memberId: varchar("memberId").notNull(),
    bookId: varchar("bookId").notNull(),
    borrowDate: timestamp("borrowDate", { mode: "date" }),
    dueDate: timestamp("dueDate", { mode: "date" }),
    returnDate: timestamp("returnDate", { mode: "date" }),
    status: varchar("status").notNull().default("pending"),
  },
  (table) => [
    index("borrow_member_id_idx").on(table.memberId),
    index("borrow_book_id_idx").on(table.bookId),
    index("borrow_due_date_idx").on(table.dueDate),
    index("borrow_status_idx").on(table.status),
    check("borrow_due_after_borrow", sql`${table.dueDate} >= ${table.borrowDate}`),
    check("borrow_status_valid", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
    check(
      "borrow_return_after_borrow",
      sql`${table.returnDate} IS NULL OR ${table.returnDate} >= ${table.borrowDate}`,
    ),
  ],
);
