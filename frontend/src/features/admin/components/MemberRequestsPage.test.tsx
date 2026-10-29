import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberRequest, memberRequestsApi } from "../api";
import { MemberRequestsPage } from "./MemberRequestsPage";

vi.mock("../api", () => ({
  memberRequestsApi: {
    list: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock("../../../shared/auth/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const request: MemberRequest = {
  memberId: "9cd77e84-5c0d-4c0f-a0de-0b0b640a0c23",
  fullName: "Alex Member",
  email: "alex@example.com",
  phone: "+1 555 0100",
  address: "10 Library Lane",
  status: "pending",
  createdAt: "2026-10-28T10:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
  }
  return render(<MemberRequestsPage />, { wrapper: Wrapper });
}

describe("member request review page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("loads requests and displays details before a decision", async () => {
    vi.mocked(memberRequestsApi.list).mockResolvedValue([request]);
    renderPage();

    expect(await screen.findByText("Alex Member")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("10 Library Lane")).toBeTruthy();
    expect(screen.getByText("+1 555 0100")).toBeTruthy();
  });

  it("approves a pending request and refreshes the list", async () => {
    vi.mocked(memberRequestsApi.list).mockResolvedValue([request]);
    vi.mocked(memberRequestsApi.approve).mockResolvedValue();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve member" }));

    await waitFor(() => expect(memberRequestsApi.approve).toHaveBeenCalledWith(request.memberId));
    await waitFor(() => expect(memberRequestsApi.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent("Registration approved.");
  });

  it("requires confirmation before rejecting a request", async () => {
    vi.mocked(memberRequestsApi.list).mockResolvedValue([request]);
    vi.mocked(memberRequestsApi.reject).mockResolvedValue();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(memberRequestsApi.reject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
    await waitFor(() => expect(memberRequestsApi.reject).toHaveBeenCalledWith(request.memberId));
  });
});
