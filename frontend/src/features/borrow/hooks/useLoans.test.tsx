import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { borrowApi } from "../api";
import { useBorrow, useLoans, useReturnLoan } from "./useLoans";

vi.mock("../api", () => ({
  borrowApi: {
    getMemberLoans: vi.fn(),
    borrow: vi.fn(),
    returnLoan: vi.fn(),
  },
}));

const loan = {
  borrowId: "loan-1",
  memberId: "member-1",
  bookId: "book-1",
  borrowDate: "2026-10-01T00:00:00.000Z",
  dueDate: "2026-10-15T00:00:00.000Z",
  returnDate: null,
  status: "approved" as const,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("borrow hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a member's Loan records", async () => {
    vi.mocked(borrowApi.getMemberLoans).mockResolvedValue([loan]);
    const { result } = renderHook(() => useLoans("member-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(borrowApi.getMemberLoans).toHaveBeenCalledWith("member-1");
    expect(result.current.data).toEqual([loan]);
  });

  it("borrows by Book ID without sending a member ID", async () => {
    vi.mocked(borrowApi.borrow).mockResolvedValue(loan);
    const { result } = renderHook(() => useBorrow("member-1"), { wrapper: createWrapper() });

    result.current.mutate("book-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(borrowApi.borrow).toHaveBeenCalledWith("book-1");
  });

  it("returns a Loan by borrow ID", async () => {
    vi.mocked(borrowApi.returnLoan).mockResolvedValue({ ...loan, returnDate: "2026-10-14T00:00:00.000Z" });
    const { result } = renderHook(() => useReturnLoan("member-1"), { wrapper: createWrapper() });

    result.current.mutate("loan-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(borrowApi.returnLoan).toHaveBeenCalledWith("loan-1");
  });
});