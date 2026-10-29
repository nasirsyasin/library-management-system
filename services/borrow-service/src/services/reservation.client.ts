import axios from "axios";
import { issueServiceToken } from "../middleware/auth.middleware";

const RESERVATION_URL = process.env.RESERVATION_SERVICE_URL || "http://reservation-service:8083";

function serviceHeaders() {
  return {
    Authorization: `Bearer ${issueServiceToken("borrow-service")}`,
  };
}

export interface ReadyReservation {
  reservationId: string;
  memberId: string;
  bookId: string;
}

export const ReservationClient = {
  notifyNextReservation: async (bookId: string): Promise<ReadyReservation | null> => {
    const { data } = await axios.post<{ reservation?: ReadyReservation }>(
      `${RESERVATION_URL}/api/reservations/notify-availability`,
      { bookId },
      { headers: serviceHeaders() },
    );
    return data.reservation ?? null;
  },

  getNextReadyReservation: async (bookId: string): Promise<ReadyReservation | null> => {
    const { data } = await axios.get<{ reservation: ReadyReservation | null }>(
      `${RESERVATION_URL}/api/internal/books/${bookId}/ready`,
      { headers: serviceHeaders() },
    );
    return data.reservation;
  },

  fulfillNextReadyReservation: (bookId: string, memberId: string) =>
    axios.patch(
      `${RESERVATION_URL}/api/internal/books/${bookId}/ready/fulfill`,
      { memberId },
      { headers: serviceHeaders() },
    ),

  restoreReadyReservation: (reservationId: string) =>
    axios.patch(
      `${RESERVATION_URL}/api/internal/reservations/${reservationId}/restore-ready`,
      undefined,
      { headers: serviceHeaders() },
    ),

  rejectNextReadyReservation: async (bookId: string, memberId: string) => {
    const { data } = await axios.patch<{ reservation?: ReadyReservation }>(
      `${RESERVATION_URL}/api/internal/books/${bookId}/ready/reject`,
      { memberId },
      { headers: serviceHeaders() },
    );
    return data.reservation ?? null;
  },
};
