import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { notifications, reservations } from "../db/schema";

export function insertReservation(memberId: string, bookId: string) {
  return db
    .insert(reservations)
    .values({ memberId, bookId, requestDate: new Date(), status: "waiting" })
    .returning()
    .then(([reservation]) => reservation);
}

export function findBookQueue(bookId: string) {
  return db
    .select()
    .from(reservations)
    .where(and(eq(reservations.bookId, bookId), eq(reservations.status, "waiting")))
    .orderBy(asc(reservations.requestDate), asc(reservations.reservationId));
}

export function findNextReadyReservation(bookId: string) {
  return db
    .select()
    .from(reservations)
    .where(and(eq(reservations.bookId, bookId), eq(reservations.status, "ready")))
    .orderBy(asc(reservations.requestDate), asc(reservations.reservationId))
    .limit(1)
    .then(([reservation]) => reservation ?? null);
}

export async function fulfillNextReadyReservation(bookId: string, memberId: string) {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.bookId, bookId), eq(reservations.status, "ready")))
      .orderBy(asc(reservations.requestDate), asc(reservations.reservationId))
      .for("update")
      .limit(1);
    if (!next || next.memberId !== memberId) return null;

    const [fulfilled] = await tx
      .update(reservations)
      .set({ status: "fulfilled" })
      .where(eq(reservations.reservationId, next.reservationId))
      .returning();
    return fulfilled ?? null;
  });
}

export async function rejectNextReadyReservation(bookId: string, memberId: string) {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.bookId, bookId), eq(reservations.status, "ready")))
      .orderBy(asc(reservations.requestDate), asc(reservations.reservationId))
      .for("update")
      .limit(1);
    if (!next || next.memberId !== memberId) return null;

    const [cancelled] = await tx
      .update(reservations)
      .set({ status: "cancelled" })
      .where(eq(reservations.reservationId, next.reservationId))
      .returning();
    return cancelled ?? null;
  });
}

export async function restoreReadyReservation(reservationId: string) {
  const [reservation] = await db
    .update(reservations)
    .set({ status: "ready" })
    .where(and(
      eq(reservations.reservationId, reservationId),
      inArray(reservations.status, ["ready", "fulfilled"]),
    ))
    .returning();
  return reservation ?? null;
}

export async function hasActiveReservationForBook(bookId: string): Promise<boolean> {
  const [reservation] = await db
    .select({ reservationId: reservations.reservationId })
    .from(reservations)
    .where(and(
      eq(reservations.bookId, bookId),
      inArray(reservations.status, ["waiting", "ready"]),
    ))
    .limit(1);
  return Boolean(reservation);
}

export function cancelReservation(reservationId: string) {
  return db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(eq(reservations.reservationId, reservationId))
    .returning()
    .then(([reservation]) => reservation);
}

export function findMemberReservations(memberId: string) {
  return db
    .select()
    .from(reservations)
    .where(eq(reservations.memberId, memberId))
    .orderBy(asc(reservations.requestDate));
}

export function findMemberNotifications(memberId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.memberId, memberId))
    .orderBy(desc(notifications.sentDate));
}

export function markNotificationRead(notificationId: string, memberId: string) {
  return db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.notificationId, notificationId), eq(notifications.memberId, memberId)))
    .returning()
    .then(([notification]) => notification);
}

export async function notifyNextReservation(bookId: string) {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.bookId, bookId), eq(reservations.status, "waiting")))
      .orderBy(asc(reservations.requestDate), asc(reservations.reservationId))
      .for("update")
      .limit(1);
    if (!next) return null;

    const [reservation] = await tx
      .update(reservations)
      .set({ status: "ready" })
      .where(eq(reservations.reservationId, next.reservationId))
      .returning();
    const [notification] = await tx
      .insert(notifications)
      .values({
        memberId: next.memberId,
        message: `Your reserved book (${bookId}) is now available. You have priority to borrow it.`,
        sentDate: new Date(),
        read: false,
      })
      .returning();
    return { reservation, notification };
  });
}
