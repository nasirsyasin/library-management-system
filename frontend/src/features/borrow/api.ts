import { api } from "../../shared/http";
import { Loan } from "./types";

export const borrowApi = {
  getMemberLoans: async (memberId: string): Promise<Loan[]> => {
    const response = await api.get<Loan[]>(`/api/borrow/borrows/member/${memberId}`);
    return response.data;
  },
  borrow: async (bookId: string): Promise<Loan> => {
    const response = await api.post<Loan>("/api/borrow/borrows", { bookId });
    return response.data;
  },
  returnLoan: async (borrowId: string): Promise<Loan> => {
    const response = await api.post<Loan>(`/api/borrow/borrows/${borrowId}/return`);
    return response.data;
  },
};