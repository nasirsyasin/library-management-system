import { FormEvent, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/useAuth";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#302d2b] bg-[#0b0a09] px-3 py-2.5 text-sm text-[#e7e5e4] outline-none placeholder:text-[#77716c] focus:border-emerald-500";

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<{ error?: unknown }>(error)) {
    return "Sign in could not be completed. Please try again.";
  }

  const isCurrentUserRequest = /(?:^|\/)auth\/me(?:[?#]|$)/.test(error.config?.url ?? "");
  const status = error.response?.status;
  const serverMessage =
    typeof error.response?.data?.error === "string" ? error.response.data.error : undefined;

  if (isCurrentUserRequest) {
    return serverMessage
      ? `Sign-in succeeded, but your account could not be verified: ${serverMessage}`
      : "Sign-in succeeded, but your account could not be verified. Please try again.";
  }

  if (status === 401) return serverMessage || "Invalid email or password.";
  if (status === 403) {
    return serverMessage || "This account cannot sign in. Contact a librarian if you need help.";
  }
  if (status === 429) return "Too many sign-in attempts. Please wait a while and try again.";
  if (!error.response) return "Unable to reach the library service. Check your connection and try again.";
  if (status !== undefined && status >= 500) {
    return "The sign-in service is temporarily unavailable. Please try again later.";
  }
  return serverMessage || "Sign in could not be completed. Please try again.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      navigate("/");
    } catch (loginError: unknown) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialEdit = (updateCredential: (value: string) => void, value: string) => {
    updateCredential(value);
    setError("");
  };

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0a09] px-4 text-[#e7e5e4]">
        <div className="w-full max-w-md rounded-xl border border-[#302d2b] bg-[#171615] p-8">
          <p className="text-sm text-[#aaa6a2]">Already signed in as {user.email}.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">Go to the library</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0a09] px-4 py-10 text-[#e7e5e4]">
      <section className="w-full max-w-md rounded-xl border border-[#302d2b] bg-[#171615] p-6 shadow-2xl sm:p-8">
        <div className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Library System</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-[#aaa6a2]">Sign in to continue to your library account.</p>
        </div>

        {error && <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2.5 text-sm text-red-300">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm text-[#c8c4c0]" htmlFor="login-email">
            Email address
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => handleCredentialEdit(setEmail, event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm text-[#c8c4c0]" htmlFor="login-password">
            Password
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => handleCredentialEdit(setPassword, event.target.value)} className={fieldClass} />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#aaa6a2]">
          New to the library?{" "}
          <Link to="/register" className="font-medium text-emerald-400 hover:text-emerald-300">Create a member account</Link>
        </p>
      </section>
    </main>
  );
}
