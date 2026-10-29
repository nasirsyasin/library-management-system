import { api } from "../../shared/http";
import { Notification } from "./types";

export const notificationApi = {
  getMemberNotifications: async (memberId: string): Promise<Notification[]> => {
    const response = await api.get<Notification[]>(`/api/reservations/notifications/member/${memberId}`);
    return response.data;
  },
  markRead: async (notificationId: string): Promise<Notification> => {
    const response = await api.patch<Notification>(`/api/reservations/notifications/${notificationId}/read`);
    return response.data;
  },
};