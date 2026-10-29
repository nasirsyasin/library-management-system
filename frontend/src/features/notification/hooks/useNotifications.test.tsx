import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationApi } from "../api";
import { BookReturnedEvent } from "../types";
import { notificationQueryKeys, useBookReturnedSocket, useMarkNotificationRead, useNotifications } from "./useNotifications";

const socketState = vi.hoisted(() => ({
  handler: null as ((event: BookReturnedEvent) => void) | null,
  disconnect: vi.fn(),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: (_event: string, handler: (event: BookReturnedEvent) => void) => { socketState.handler = handler; },
    disconnect: socketState.disconnect,
  })),
}));

vi.mock("../api", () => ({
  notificationApi: { getMemberNotifications: vi.fn(), markRead: vi.fn() },
}));

const notification = {
  notificationId: "notification-1",
  memberId: "member-1",
  message: "Your reserved Book is ready.",
  sentDate: "2026-10-14T10:00:00.000Z",
  read: false,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("notification hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketState.handler = null;
    localStorage.setItem("token", "test-token");
  });

  it("loads a member's Notifications", async () => {
    vi.mocked(notificationApi.getMemberNotifications).mockResolvedValue([notification]);
    const { result } = renderHook(() => useNotifications("member-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notificationApi.getMemberNotifications).toHaveBeenCalledWith("member-1");
    expect(result.current.data).toEqual([notification]);
  });

  it("marks a Notification as read", async () => {
    vi.mocked(notificationApi.markRead).mockResolvedValue({ ...notification, read: true });
    const { result } = renderHook(() => useMarkNotificationRead("member-1"), { wrapper: createWrapper() });

    result.current.mutate("notification-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationApi.markRead).toHaveBeenCalledWith("notification-1");
  });

  it("refreshes affected server state after a book-returned event", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const notificationKey = notificationQueryKeys.member("member-1");
    queryClient.setQueryData(notificationKey, [notification]);
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { unmount } = renderHook(() => useBookReturnedSocket("member-1"), { wrapper });

    await waitFor(() => expect(socketState.handler).not.toBeNull());
    socketState.handler?.({ bookId: "book-1", notificationId: "notification-2" });

    await waitFor(() => expect(queryClient.getQueryState(notificationKey)?.isInvalidated).toBe(true));
    unmount();
    expect(socketState.disconnect).toHaveBeenCalled();
  });
});