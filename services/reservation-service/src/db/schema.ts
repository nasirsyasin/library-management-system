import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const reservations = pgTable(
  "reservation",
  {
    reservationId: uuid("reservationId").defaultRandom().primaryKey(),
    memberId: varchar("memberId").notNull(),
    bookId: varchar("bookId").notNull(),
    requestDate: timestamp("requestDate", { mode: "date" }).notNull(),
    status: varchar("status").$type<"waiting" | "ready" | "fulfilled" | "cancelled">().notNull().default("waiting"),
  },
  (table) => [
    index("reservation_book_queue_idx").on(table.bookId, table.status, table.requestDate, table.reservationId),
    index("reservation_member_request_idx").on(table.memberId, table.requestDate),
    check(
      "reservation_status_valid",
      sql`${table.status} IN ('waiting', 'ready', 'fulfilled', 'cancelled')`,
    ),
  ],
);

export const notifications = pgTable(
  "notification",
  {
    notificationId: uuid("notificationId").defaultRandom().primaryKey(),
    memberId: varchar("memberId").notNull(),
    message: varchar("message").notNull(),
    sentDate: timestamp("sentDate", { mode: "date" }).notNull(),
    read: boolean("read").notNull().default(false),
  },
  (table) => [
    index("notification_member_sent_idx").on(table.memberId, table.sentDate),
  ],
);
