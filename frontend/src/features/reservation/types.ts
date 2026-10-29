export type ReservationStatus = "waiting" | "ready" | "fulfilled" | "cancelled";

export interface Reservation {
  reservationId: string;
  memberId: string;
  bookId: string;
  requestDate: string;
  status: ReservationStatus;
}

export interface MemberReservation extends Reservation {
  queuePosition: number | null;
}