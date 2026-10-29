import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authAPI } from "../api";
import { RegisterPage } from "./RegisterPage";

vi.mock("../api", () => ({
  authAPI: { register: vi.fn() },
}));

describe("member registration page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("submits valid details and shows the pending approval confirmation", async () => {
    vi.mocked(authAPI.register).mockResolvedValue({
      data: { message: "Your registration has been submitted and is awaiting administrator approval." },
    } as never);
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Member" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LibraryPassword2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "LibraryPassword2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));

    await waitFor(() => expect(authAPI.register).toHaveBeenCalledWith({
      fullName: "Alex Member",
      email: "alex@example.com",
      password: "LibraryPassword2026",
    }));
    expect(await screen.findByText("Your registration has been submitted and is awaiting administrator approval.")).toBeTruthy();
  });

  it("does not submit when passwords do not match", () => {
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Member" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LibraryPassword2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "DifferentPassword2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));

    expect(screen.getByRole("alert").textContent).toBe("Passwords do not match.");
    expect(authAPI.register).not.toHaveBeenCalled();
  });

  it("shows a duplicate-email response from the real API", async () => {
    vi.mocked(authAPI.register).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "An account with this email already exists." } },
    });
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Member" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LibraryPassword2026" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "LibraryPassword2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit registration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An account with this email already exists.");
  });
});
