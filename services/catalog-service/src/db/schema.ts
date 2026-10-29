import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const authors = pgTable("author", {
  authorId: uuid("authorId").defaultRandom().primaryKey(),
  name: varchar("name").notNull(),
});

export const books = pgTable(
  "book",
  {
    bookId: uuid("bookId").defaultRandom().primaryKey(),
    title: varchar("title").notNull(),
    isbn: varchar("isbn").notNull(),
    totalCopies: integer("totalCopies").notNull(),
    availableCopies: integer("availableCopies").notNull(),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    authorAuthorId: uuid("authorAuthorId")
      .references(() => authors.authorId, { onDelete: "restrict" }),
  },
  (table) => [
    index("book_author_id_idx").on(table.authorAuthorId),
    uniqueIndex("book_isbn_uq").on(table.isbn),
    check("book_total_copies_nonnegative", sql`${table.totalCopies} >= 0`),
    check(
      "book_available_copies_valid",
      sql`${table.availableCopies} >= 0 AND ${table.availableCopies} <= ${table.totalCopies}`,
    ),
  ],
);

export const authorsRelations = relations(authors, ({ many }) => ({
  books: many(books),
}));

export const booksRelations = relations(books, ({ one }) => ({
  author: one(authors, {
    fields: [books.authorAuthorId],
    references: [authors.authorId],
  }),
}));
