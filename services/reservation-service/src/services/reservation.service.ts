import axios from "axios";
import {
  cancelReservation,
  findBookQueue,
  findMemberNotifications,
  findMemberReservations,
  findNextReadyReservation,
  fulfillNextReadyReservation,
  insertReservation,
  markNotificationRead as setNotificationRead,
  notifyNextReservation,
  rejectNextReadyReservation,
  restoreReadyReservation,
} from "../repositories/reservation.repository";
import { assertBookIsActive } from "./catalog.client";
import { issueServiceToken } from "../middleware/auth.middleware";

export const ReservationService = {
  create: async (memberId: string, bookId: string) => {
    await assertBookIsActive(bookId);
    const reservation = await insertReservation(memberId, bookId);
    try {
      await assertBookIsActive(bookId);
      return reservation;
    } catch (error: unknown) {
      try {
        await cancelReservation(reservation.reservationId);
      } catch (cancelError: unknown) {
        console.error("Reservation was created during book archival and could not be cancelled", cancelError);
      }
      throw error;
    }
  },
  getQueueForBook: findBookQueue,
  getNextReadyReservation: findNextReadyReservation,
  fulfillNextReadyReservation,
  restoreReadyReservation,

  rejectNextReadyReservation: async (bookId: string, memberId: string) => {
    const rejected = await rejectNextReadyReservation(bookId, memberId);
    if (!rejected) return null;
    const next = await ReservationService.notifyNextInQueue(bookId);
    return next?.reservation ?? null;
  },

  getMemberReservations: async (memberId: string) => {
    const reservations = await findMemberReservations(memberId);
    return Promise.all(reservations.map(async (reservation) => {
      if (reservation.status !== "waiting") return { ...reservation, queuePosition: null };
      const waitingList = await findBookQueue(reservation.bookId);
      const queueIndex = waitingList.findIndex((entry) => entry.reservationId === reservation.reservationId);
      return { ...reservation, queuePosition: queueIndex < 0 ? null : queueIndex + 1 };
    }));
  },

  getMemberNotifications: findMemberNotifications,
  markNotificationRead: setNotificationRead,

  notifyNextInQueue: async (bookId: string) => {
    const result = await notifyNextReservation(bookId);
    if (!result) return null;

    const serviceToken = issueServiceToken("reservation-service");
    try {
      await axios.post(
        `${process.env.API_GATEWAY_URL || "http://localhost:8080"}/internal/book-returned`,
        {
          memberId: result.reservation.memberId,
          bookId,
          notificationId: result.notification.notificationId,
        },
        { headers: { Authorization: `Bearer ${serviceToken}` } },
      );
    } catch {
      console.warn("Socket notification delivery failed; the saved notification remains available by HTTP");
    }

    return result;
  },
};
