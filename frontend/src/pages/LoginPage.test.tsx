import { AxiosError } from "axios";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../shared/http";
import { LoginPage } from "./LoginPage";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../shared/auth/useAuth", () => ({
  useAuth: () => ({ login, user: null }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Library home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function createAxiosError(status: number, url: string, data: unknown) {
  return {
    isAxiosError: true,
    config: { url },
    response: { status, data },
  };
}

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("keeps an invalid-credentials message visible until credentials are edited", async () => {
    login.mockRejectedValue(createAxiosError(401, "/auth/login", {
      error: "Invalid email or password.",
    }));
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "updated-password" },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a separate message when login succeeded but /auth/me failed", async () => {
    login.mockRejectedValue(createAxiosError(503, "/auth/me", {
      error: "Account status could not be verified. Please try again.",
    }));
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in succeeded, but your account could not be verified",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Account status could not be verified.");
  });

  it.each([
    [403, "This account cannot sign in. Contact a librarian if you need help."],
    [429, "Too many sign-in attempts. Please wait a while and try again."],
    [503, "The sign-in service is temporarily unavailable. Please try again later."],
  ])("shows an appropriate message for HTTP %i", async (status, message) => {
    login.mockRejectedValue(createAxiosError(status, "/auth/login", {}));
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("shows a connection message when the gateway cannot be reached", async () => {
    login.mockRejectedValue(Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      config: { url: "/auth/login" },
      code: "ERR_NETWORK",
    }));
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach the library service.",
    );
  });

  it("navigates only after login resolves", async () => {
    login.mockResolvedValue(undefined);
    function CurrentLocation() {
      return <p>{useLocation().pathname}</p>;
    }

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("/")).toBeInTheDocument();
  });
});

describe("401 response interceptor", () => {
  it("does not clear the session token for an /auth/login failure", async () => {
    localStorage.setItem("token", "existing-session");

    await expect(api.post("/auth/login", {}, {
      adapter: async (config) => {
        const response = {
          status: 401,
          data: { error: "Invalid email or password." },
          statusText: "Unauthorized",
          headers: {},
          config,
        };
        throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
      },
    })).rejects.toBeInstanceOf(AxiosError);

    expect(localStorage.getItem("token")).toBe("existing-session");
    localStorage.removeItem("token");
  });
});
