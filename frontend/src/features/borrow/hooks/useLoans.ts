import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogQueryKeys } from "../../catalog/hooks/useBooks";
import { borrowApi } from "../api";

export const loanQueryKeys = {
  member: (memberId: string) => ["borrow", "loans", memberId] as const,
};

export function useLoans(memberId: string) {
  return useQuery({
    queryKey: loanQueryKeys.member(memberId),
    queryFn: () => borrowApi.getMemberLoans(memberId),
    enabled: Boolean(memberId),
    refetchInterval: (query) =>
      query.state.data?.some((loan) => loan.status === "pending") ? 10_000 : false,
  });
}

export function useBorrow(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => borrowApi.borrow(bookId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: loanQueryKeys.member(memberId) }),
        queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all }),
      ]);
    },
    onError: async (error, bookId) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: catalogQueryKeys.detail(bookId) }),
          queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all }),
        ]);
      }
    },
  });
}

export function useReturnLoan(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (borrowId: string) => borrowApi.returnLoan(borrowId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: loanQueryKeys.member(memberId) }),
        queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all }),
      ]);
    },
  });
}

export function getBorrowErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return "That copy was just borrowed by someone else. Availability has been refreshed; check the Catalog and try again.";
  }
  if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data.error) {
    return error.response.data.error;
  }
  return "Borrow action could not be completed. Check your connection and try again.";
}