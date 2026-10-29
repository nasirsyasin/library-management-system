import { api } from "../../shared/http";
import { Loan } from "../borrow/types";

export type MemberAccountStatus = "pending" | "approved" | "rejected";

export interface MemberRequest {
  memberId: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: MemberAccountStatus;
  createdAt: string;
}

export const memberRequestsApi = {
  list: async (): Promise<MemberRequest[]> => {
    const response = await api.get<MemberRequest[]>("/admin/member-requests");
    return response.data;
  },
  approve: async (memberId: string): Promise<void> => {
    await api.patch(`/admin/member-requests/${memberId}/approve`);
  },
  reject: async (memberId: string): Promise<void> => {
    await api.patch(`/admin/member-requests/${memberId}/reject`);
  },
};

export const borrowRequestsApi = {
  list: async (): Promise<Loan[]> => {
    const response = await api.get<Loan[]>("/api/borrow/borrows/requests");
    return response.data;
  },
  approve: async (borrowId: string): Promise<Loan> => {
    const response = await api.patch<Loan>(`/api/borrow/borrows/requests/${borrowId}/approve`);
    return response.data;
  },
  reject: async (borrowId: string): Promise<Loan> => {
    const response = await api.patch<Loan>(`/api/borrow/borrows/requests/${borrowId}/reject`);
    return response.data;
  },
};
