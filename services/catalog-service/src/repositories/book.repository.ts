import { and, eq, gt, ilike, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, books } from "../db/schema";

export type BookWithAuthor = typeof books.$inferSelect & {
  author: typeof authors.$inferSelect | null;
};

function withAuthor(
  rows: { book: typeof books.$inferSelect; author: typeof authors.$inferSelect | null }[],
): BookWithAuthor[] {
  return rows.map(({ book, author }) => ({ ...book, author }));
}

export async function searchBooks(query: string): Promise<BookWithAuthor[]> {
  const pattern = `%${query}%`;
  const rows = await db
    .select({ book: books, author: authors })
    .from(books)
    .leftJoin(authors, eq(books.authorAuthorId, authors.authorId))
    .where(and(
      isNull(books.archivedAt),
      or(ilike(books.title, pattern), ilike(authors.name, pattern), ilike(books.isbn, pattern)),
    ));
  return withAuthor(rows);
}

export async function findBookById(bookId: string): Promise<BookWithAuthor | null> {
  const [row] = await db
    .select({ book: books, author: authors })
    .from(books)
    .leftJoin(authors, eq(books.authorAuthorId, authors.authorId))
    .where(eq(books.bookId, bookId))
    .limit(1);
  return row ? { ...row.book, author: row.author } : null;
}

export async function hasAvailableCopies(bookId: string): Promise<boolean> {
  const [book] = await db
    .select({ availableCopies: books.availableCopies })
    .from(books)
    .where(and(eq(books.bookId, bookId), isNull(books.archivedAt), gt(books.availableCopies, 0)))
    .limit(1);
  return Boolean(book);
}

export async function decrementAvailableCopies(bookId: string) {
  const [book] = await db
    .update(books)
    .set({ availableCopies: sql`${books.availableCopies} - 1` })
    .where(and(eq(books.bookId, bookId), isNull(books.archivedAt), gt(books.availableCopies, 0)))
    .returning();
  if (!book) throw new Error("No copies available");
  return book;
}

export async function incrementAvailableCopies(bookId: string) {
  const [book] = await db
    .update(books)
    .set({ availableCopies: sql`${books.availableCopies} + 1` })
    .where(and(eq(books.bookId, bookId), lt(books.availableCopies, books.totalCopies)))
    .returning();
  if (book) return book;

  const [existing] = await db.select({ bookId: books.bookId }).from(books).where(eq(books.bookId, bookId)).limit(1);
  if (!existing) throw new Error("Book not found");
  throw new Error("All copies are already available");
}

export async function addBookCopy(bookId: string): Promise<BookWithAuthor | null> {
  const exists = await db.transaction(async (tx) => {
    const [book] = await tx
      .select({ bookId: books.bookId })
      .from(books)
      .where(and(eq(books.bookId, bookId), isNull(books.archivedAt)))
      .for("update")
      .limit(1);
    if (!book) return false;

    await tx
      .update(books)
      .set({
        totalCopies: sql`${books.totalCopies} + 1`,
        availableCopies: sql`${books.availableCopies} + 1`,
      })
      .where(and(eq(books.bookId, bookId), isNull(books.archivedAt)));
    return true;
  });

  return exists ? findBookById(bookId) : null;
}

export async function archiveBook(bookId: string): Promise<"archived" | "not-found" | "active-borrowings"> {
  return db.transaction(async (tx) => {
    const [book] = await tx
      .select({
        bookId: books.bookId,
        totalCopies: books.totalCopies,
        availableCopies: books.availableCopies,
      })
      .from(books)
      .where(and(eq(books.bookId, bookId), isNull(books.archivedAt)))
      .for("update")
      .limit(1);
    if (!book) return "not-found";
    if (book.availableCopies < book.totalCopies) return "active-borrowings";

    await tx
      .update(books)
      .set({ archivedAt: new Date() })
      .where(and(eq(books.bookId, bookId), isNull(books.archivedAt)));
    return "archived";
  });
}

export async function restoreArchivedBook(bookId: string): Promise<void> {
  await db
    .update(books)
    .set({ archivedAt: null })
    .where(and(eq(books.bookId, bookId), sql`${books.archivedAt} IS NOT NULL`));
}

export function insertBook(input: {
  title: string;
  isbn: string;
  totalCopies: number;
  authorAuthorId: string;
}) {
  return db
    .insert(books)
    .values({ ...input, availableCopies: input.totalCopies })
    .returning()
    .then(([book]) => book);
}
