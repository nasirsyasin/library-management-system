import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reservationApi } from "../api";
import { useCreateReservation, useReservations } from "./useReservations";

vi.mock("../api", () => ({
  reservationApi: { getMemberReservations: vi.fn(), createReservation: vi.fn() },
}));

const reservation = {
  reservationId: "reservation-1",
  memberId: "member-1",
  bookId: "book-1",
  requestDate: "2026-10-14T10:00:00.000Z",
  status: "waiting" as const,
  queuePosition: 2,
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("reservation hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the member's ordered waiting list", async () => {
    vi.mocked(reservationApi.getMemberReservations).mockResolvedValue([reservation]);
    const { result } = renderHook(() => useReservations("member-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reservationApi.getMemberReservations).toHaveBeenCalledWith("member-1");
    expect(result.current.data?.[0].queuePosition).toBe(2);
  });

  it("creates a Reservation using Book ID", async () => {
    vi.mocked(reservationApi.createReservation).mockResolvedValue(reservation);
    const { result } = renderHook(() => useCreateReservation("member-1"), { wrapper: createWrapper() });

    result.current.mutate("book-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reservationApi.createReservation).toHaveBeenCalledWith("book-1");
  });
});