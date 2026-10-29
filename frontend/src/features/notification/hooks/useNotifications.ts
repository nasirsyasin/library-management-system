import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { catalogQueryKeys } from "../../catalog/hooks/useBooks";
import { reservationQueryKeys } from "../../reservation/hooks/useReservations";
import { notificationApi } from "../api";
import { BookReturnedEvent } from "../types";

export const notificationQueryKeys = {
  member: (memberId: string) => ["notification", "member", memberId] as const,
};

export function useNotifications(memberId: string) {
  return useQuery({
    queryKey: notificationQueryKeys.member(memberId),
    queryFn: () => notificationApi.getMemberNotifications(memberId),
    enabled: Boolean(memberId),
  });
}

export function useMarkNotificationRead(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.member(memberId) }),
  });
}

export function useBookReturnedSocket(memberId: string) {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!memberId || !token) return;

    const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080", {
      auth: { token },
    });
    socket.on("book-returned", (event: BookReturnedEvent) => {
      if (typeof event.bookId !== "string") return;
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.member(memberId) });
      void queryClient.invalidateQueries({ queryKey: reservationQueryKeys.member(memberId) });
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.detail(event.bookId) });
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    });

    return () => {
      socket.disconnect();
    };
  }, [memberId, queryClient, token]);
}