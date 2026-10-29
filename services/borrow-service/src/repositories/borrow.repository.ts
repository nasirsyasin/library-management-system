import { and, desc, eq, inArray, isNull, lt, ne } from "drizzle-orm";
import { db } from "../db";
import { borrows } from "../db/schema";

export function findActiveBorrows() {
  return db.select().from(borrows).where(and(eq(borrows.status, "approved"), isNull(borrows.returnDate)));
}

export function findPendingBorrowRequests() {
  return db
    .select()
    .from(borrows)
    .where(eq(borrows.status, "pending"))
    .orderBy(desc(borrows.borrowId));
}

export async function hasActiveBorrowForBook(bookId: string): Promise<boolean> {
  const [borrow] = await db
    .select({ borrowId: borrows.borrowId })
    .from(borrows)
    .where(and(eq(borrows.bookId, bookId), ne(borrows.status, "rejected"), isNull(borrows.returnDate)))
    .limit(1);
  return Boolean(borrow);
}

export function findOverdueBorrows(now: Date) {
  return db
    .select()
    .from(borrows)
    .where(and(eq(borrows.status, "approved"), isNull(borrows.returnDate), lt(borrows.dueDate, now)));
}

export function findMemberBorrows(memberId: string) {
  return db
    .select()
    .from(borrows)
    .where(eq(borrows.memberId, memberId))
    .orderBy(desc(borrows.borrowDate));
}

export function findBorrowById(borrowId: string) {
  return db.select().from(borrows).where(eq(borrows.borrowId, borrowId)).limit(1).then(([borrow]) => borrow);
}

export function insertBorrow(values: typeof borrows.$inferInsert) {
  return db.insert(borrows).values(values).returning().then(([borrow]) => borrow);
}

export async function findOpenBorrowForMemberBook(memberId: string, bookId: string) {
  const [borrow] = await db
    .select()
    .from(borrows)
    .where(and(
      eq(borrows.memberId, memberId),
      eq(borrows.bookId, bookId),
      inArray(borrows.status, ["pending", "approved"]),
      isNull(borrows.returnDate),
    ))
    .limit(1);
  return borrow ?? null;
}
