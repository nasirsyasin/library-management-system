import { api } from "../../shared/http";
import { MemberReservation, Reservation } from "./types";

export const reservationApi = {
  getBookQueue: async (bookId: string): Promise<Reservation[]> => {
    const response = await api.get<Reservation[]>(`/api/reservations/reservations/book/${bookId}`);
    return response.data;
  },
  getMemberReservations: async (memberId: string): Promise<MemberReservation[]> => {
    const response = await api.get<MemberReservation[]>(`/api/reservations/reservations/member/${memberId}`);
    return response.data;
  },
  createReservation: async (bookId: string): Promise<Reservation> => {
    const response = await api.post<Reservation>("/api/reservations/reservations", { bookId });
    return response.data;
  },
};