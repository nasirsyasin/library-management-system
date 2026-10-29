import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reservationApi } from "../api";

export const reservationQueryKeys = {
  member: (memberId: string) => ["reservation", "member", memberId] as const,
};

export function useReservations(memberId: string) {
  return useQuery({
    queryKey: reservationQueryKeys.member(memberId),
    queryFn: () => reservationApi.getMemberReservations(memberId),
    enabled: Boolean(memberId),
  });
}

export function useCreateReservation(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => reservationApi.createReservation(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationQueryKeys.member(memberId) }),
  });
}

export function getReservationErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data.error) {
    return error.response.data.error;
  }
  return "Reservation could not be created. Check your connection and try again.";
}