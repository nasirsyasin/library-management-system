import { FormEvent, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { authAPI } from "../api";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#302d2b] bg-[#0b0a09] px-3 py-2.5 text-sm text-[#e7e5e4] outline-none placeholder:text-[#77716c] focus:border-emerald-500";
const submissionMessage = "Your registration has been submitted and is awaiting administrator approval.";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be 12–128 characters and include an uppercase letter, a lowercase letter, and a number.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        fullName,
        email,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
      });
      setSubmitted(true);
      setError("");
    } catch (registrationError: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(registrationError)
        ? registrationError.response?.data.error
        : undefined;
      setError(message || "Registration could not be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0a09] px-4 py-10 text-[#e7e5e4]">
      <section className="w-full max-w-xl rounded-xl border border-[#302d2b] bg-[#171615] p-6 shadow-2xl sm:p-8">
        <div className="mb-7">
          <Link to="/login" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Library System</Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create Member Account</h1>
          <p className="mt-2 text-sm text-[#aaa6a2]">Submit your details to request a library membership.</p>
        </div>

        {submitted ? (
          <div role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-5">
            <p className="font-medium text-emerald-300">{submissionMessage}</p>
            <Link to="/login" className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:text-emerald-300">Return to sign in</Link>
          </div>
        ) : (
          <>
            {error && <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2.5 text-sm text-red-300">{error}</div>}
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[#c8c4c0] sm:col-span-2" htmlFor="register-name">
                Full name
                <input id="register-name" autoComplete="name" required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-sm text-[#c8c4c0] sm:col-span-2" htmlFor="register-email">
                Email address
                <input id="register-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-sm text-[#c8c4c0]" htmlFor="register-phone">
                Phone number <span className="text-[#77716c]">(optional)</span>
                <input id="register-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-sm text-[#c8c4c0]" htmlFor="register-address">
                Address <span className="text-[#77716c]">(optional)</span>
                <input id="register-address" autoComplete="street-address" maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-sm text-[#c8c4c0]" htmlFor="register-password">
                Password
                <input id="register-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} />
              </label>
              <label className="block text-sm text-[#c8c4c0]" htmlFor="register-confirm-password">
                Confirm password
                <input id="register-confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={fieldClass} />
              </label>
              <p className="text-xs text-[#8e8984] sm:col-span-2">Use 12–128 characters, including uppercase and lowercase letters and a number.</p>
              <button type="submit" disabled={loading} className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
                {loading ? "Submitting..." : "Submit registration"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-[#aaa6a2]">
              Already registered? <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">Sign in</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
