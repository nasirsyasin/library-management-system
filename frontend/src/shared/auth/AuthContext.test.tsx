import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authAPI } from "../../api";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("../../api", () => ({
  authAPI: {
    login: vi.fn(),
    currentUser: vi.fn(),
  },
}));

function AuthConsumer() {
  const { login, user } = useAuth();
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button onClick={() => login("alex@example.com", "password").catch(() => setFailed(true))}>
        Sign in
      </button>
      <p>{user?.email ?? "Signed out"}</p>
      {failed ? <p>Login rejected</p> : null}
    </>
  );
}

describe("AuthProvider login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("token");
  });
  afterEach(() => localStorage.removeItem("token"));

  it("clears a newly issued token when the following /auth/me request fails", async () => {
    vi.mocked(authAPI.login).mockResolvedValue({ data: { token: "test-token" } } as never);
    vi.mocked(authAPI.currentUser).mockRejectedValue(new Error("profile lookup failed"));
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Login rejected")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    expect(screen.getByText("Signed out")).toBeInTheDocument();
    expect(authAPI.currentUser).toHaveBeenCalledTimes(1);
  });
});
