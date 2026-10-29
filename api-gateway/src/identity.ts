import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { accounts } from "./db/schema";
import { AccountStatus } from "./auth";

const scrypt = promisify(scryptCallback);

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  phone: string | null;
  address: string | null;
}

export interface RegistrationValidation {
  value?: RegistrationInput;
  error?: string;
}

export function validateRegistration(body: unknown): RegistrationValidation {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Enter valid registration details." };
  }
  const input = body as Record<string, unknown>;
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const address = typeof input.address === "string" ? input.address.trim() : "";

  if (!fullName || fullName.length > 120) return { error: "Enter your full name (up to 120 characters)." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must be 12–128 characters and include an uppercase letter, a lowercase letter, and a number." };
  }
  if (phone.length > 40 || address.length > 500) return { error: "Phone or address is too long." };

  return {
    value: {
      fullName,
      email,
      password,
      phone: phone || null,
      address: address || null,
    },
  };
}

export function validateLogin(body: unknown): { email: string; password: string } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.email !== "string" || typeof input.password !== "string") return null;
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || input.password.length === 0 || input.password.length > 128) return null;
  return { email, password: input.password };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, hash] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return timingSafeEqual(actual, expected);
}

const dummyPasswordHash = `scrypt$gateway-login-dummy$${scryptSync("not-a-real-password", "gateway-login-dummy", 64).toString("hex")}`;

export async function authenticatePassword(email: string, password: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  const passwordMatches = await verifyPassword(password, account?.passwordHash ?? dummyPasswordHash);
  if (!account || !passwordMatches) return { kind: "invalid" as const };
  if (account.status === "pending") return { kind: "pending" as const };
  if (account.status === "rejected") return { kind: "rejected" as const };
  return { kind: "approved" as const, account };
}

export function getLoginStatusError(status: AccountStatus): string | null {
  if (status === "pending") return "Your account is awaiting administrator approval.";
  if (status === "rejected") return "This account is not eligible to sign in.";
  return null;
}

export async function createMember(input: RegistrationInput): Promise<void> {
  await db.insert(accounts).values({
    fullName: input.fullName,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    phone: input.phone,
    address: input.address,
    role: "member",
    status: "pending",
  });
}

export async function provisionAdministrator(email: string, fullName: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const validation = validateRegistration({ fullName, email: normalizedEmail, password });
  if (!validation.value) throw new Error(`Invalid administrator bootstrap configuration: ${validation.error}`);
  await db.insert(accounts).values({
    fullName: validation.value.fullName,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: "librarian",
    status: "approved",
  }).onConflictDoNothing({ target: accounts.email });
}

export async function listMemberRequests() {
  return db.select({
    memberId: accounts.memberId,
    fullName: accounts.fullName,
    email: accounts.email,
    phone: accounts.phone,
    address: accounts.address,
    status: accounts.status,
    createdAt: accounts.createdAt,
  })
    .from(accounts)
    .where(eq(accounts.role, "member"))
    .orderBy(
      sql`case ${accounts.status} when 'pending' then 0 when 'approved' then 1 else 2 end`,
      desc(accounts.createdAt),
    );
}

export async function changeMemberStatus(
  memberId: string,
  status: Extract<AccountStatus, "approved" | "rejected">,
): Promise<"updated" | "not-found" | "invalid-transition"> {
  const updated = await db.update(accounts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(accounts.memberId, memberId), eq(accounts.role, "member"), eq(accounts.status, "pending")))
    .returning({ memberId: accounts.memberId });
  if (updated.length > 0) return "updated";

  const [account] = await db.select({ status: accounts.status })
    .from(accounts)
    .where(and(eq(accounts.memberId, memberId), eq(accounts.role, "member")))
    .limit(1);
  return account ? "invalid-transition" : "not-found";
}
