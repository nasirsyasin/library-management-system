import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { borrows } from "../db/schema";
import {
  findActiveBorrows,
  findOpenBorrowForMemberBook,
  findMemberBorrows,
  findOverdueBorrows,
  findPendingBorrowRequests,
  insertBorrow,
} from "../repositories/borrow.repository";
import { CatalogClient } from "./catalog.client";
import { ReservationClient } from "./reservation.client";

const BORROW_PERIOD_DAYS = 14;

export const BorrowService = {
  getActiveBorrows: findActiveBorrows,

  getOverdueBorrows: () => findOverdueBorrows(new Date()),

  getMemberHistory: findMemberBorrows,

  getPendingBorrowRequests: findPendingBorrowRequests,

  requestBorrow: async (memberId: string, bookId: string) => {
    const existing = await findOpenBorrowForMemberBook(memberId, bookId);
    if (existing) return existing;
    return insertBorrow({ memberId, bookId, status: "pending" });
  },

  requestReservedBorrow: async (memberId: string, bookId: string) => {
    const existing = await findOpenBorrowForMemberBook(memberId, bookId);
    if (existing) return existing;
    return insertBorrow({ memberId, bookId, status: "pending" });
  },

  approveBorrowRequest: async (borrowId: string) => {
    let inventoryBookId: string | undefined;
    try {
      const approval = await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(borrows)
          .where(eq(borrows.borrowId, borrowId))
          .for("update")
          .limit(1);
        if (!request) throw new Error("Borrow request not found");
        if (request.status !== "pending") throw new Error("Borrow request is no longer pending");

        const readyReservation = await ReservationClient.getNextReadyReservation(request.bookId);
        if (readyReservation && readyReservation.memberId !== request.memberId) {
          throw new Error("Book is reserved for another member");
        }

        if (!readyReservation) {
          await CatalogClient.decrementAvailability(request.bookId);
          inventoryBookId = request.bookId;
        }

        const borrowDate = new Date();
        const dueDate = new Date(borrowDate.getTime() + BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        const [approved] = await tx
          .update(borrows)
          .set({ status: "approved", borrowDate, dueDate })
          .where(and(eq(borrows.borrowId, borrowId), eq(borrows.status, "pending")))
          .returning();
        if (!approved) throw new Error("Borrow request is no longer pending");
        return { borrow: approved, reservation: readyReservation };
      });

      if (approval.reservation) {
        try {
          await ReservationClient.fulfillNextReadyReservation(
            approval.reservation.bookId,
            approval.reservation.memberId,
          );
        } catch (error: unknown) {
          try {
            await ReservationClient.restoreReadyReservation(approval.reservation.reservationId);
          } catch (restoreError: unknown) {
            console.error("Could not restore a ready reservation after approval failed", restoreError);
          }
          const [reopened] = await db.update(borrows)
            .set({ status: "pending", borrowDate: null, dueDate: null })
            .where(and(eq(borrows.borrowId, borrowId), eq(borrows.status, "approved")))
            .returning({ borrowId: borrows.borrowId });
          if (reopened) {
            inventoryBookId = approval.reservation.bookId;
          } else {
            inventoryBookId = undefined;
            console.error("Could not restore the pending borrow after reservation fulfillment failed", error);
          }
          throw error;
        }
      }

      return approval.borrow;
    } catch (error) {
      if (inventoryBookId) {
        try {
          await CatalogClient.incrementAvailability(inventoryBookId);
        } catch (compensationError) {
          console.error("Borrow approval failed and catalog inventory compensation failed", compensationError);
        }
      }
      if (
        error instanceof Error &&
        [
          "Borrow request not found",
          "Borrow request is no longer pending",
          "Book is not available",
          "Book is reserved for another member",
        ].includes(error.message)
      ) {
        throw error;
      }
      console.error("Borrow request could not be approved", error);
      throw new Error("Borrow request could not be approved");
    }
  },

  rejectBorrowRequest: async (borrowId: string) => {
    const [request] = await db
      .update(borrows)
      .set({ status: "rejected" })
      .where(and(eq(borrows.borrowId, borrowId), eq(borrows.status, "pending")))
      .returning();
    if (request) return request;

    const [existing] = await db
      .select({ borrowId: borrows.borrowId })
      .from(borrows)
      .where(eq(borrows.borrowId, borrowId))
      .limit(1);
    if (!existing) throw new Error("Borrow request not found");
    throw new Error("Borrow request is no longer pending");
  },

  handleRejectedReservedBorrow: async (borrow: { bookId: string; memberId: string }) => {
    const ready = await ReservationClient.getNextReadyReservation(borrow.bookId);
    if (!ready || ready.memberId !== borrow.memberId) return;

    const next = await ReservationClient.rejectNextReadyReservation(borrow.bookId, borrow.memberId);
    if (next) {
      await BorrowService.requestReservedBorrow(next.memberId, next.bookId);
      return;
    }

    await CatalogClient.incrementAvailability(borrow.bookId);
  },

  finalizeReturnedBook: async (bookId: string) => {
    const reservation = await ReservationClient.notifyNextReservation(bookId);
    if (reservation) {
      await BorrowService.requestReservedBorrow(reservation.memberId, reservation.bookId);
      return;
    }

    await CatalogClient.incrementAvailability(bookId);
  },

  returnBook: async (borrowId: string, memberId: string) => {
    try {
      return await db.transaction(async (tx) => {
        const [borrow] = await tx
          .select()
          .from(borrows)
          .where(eq(borrows.borrowId, borrowId))
          .for("update")
          .limit(1);
        if (!borrow) throw new Error("Borrow not found");
        if (borrow.memberId !== memberId) throw new Error("Forbidden");
        if (borrow.status !== "approved") throw new Error("Borrow is not an active loan");
        if (borrow.returnDate) throw new Error("Borrow has already been returned");

        const [returned] = await tx
          .update(borrows)
          .set({ returnDate: new Date() })
          .where(and(eq(borrows.borrowId, borrowId), eq(borrows.status, "approved"), isNull(borrows.returnDate)))
          .returning();
        if (!returned) throw new Error("Borrow has already been returned");
        return returned;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        ["Borrow not found", "Forbidden", "Borrow is not an active loan", "Borrow has already been returned"].includes(error.message)
      ) {
        throw error;
      }
      console.error("Borrow return could not be completed");
      throw new Error("Return could not be completed");
    }
  },
};
