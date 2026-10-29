import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { accounts } from "./db/schema";

export type AccountRole = "member" | "librarian";
export type AccountStatus = "pending" | "approved" | "rejected";

export interface AuthenticatedIdentity {
  memberId: string;
  role: AccountRole;
  status: AccountStatus;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      identity?: AuthenticatedIdentity;
    }
  }
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

export function issueToken(identity: Pick<AuthenticatedIdentity, "memberId" | "role" | "email" | "fullName">): string {
  return jwt.sign(identity, jwtSecret(), { expiresIn: "12h" });
}

export function issueServiceToken(service: string): string {
  return jwt.sign({ service }, jwtSecret(), { expiresIn: "1m" });
}

async function loadIdentity(token: string): Promise<AuthenticatedIdentity | null> {
  let claims: string | JwtPayload;
  try {
    claims = jwt.verify(token, jwtSecret());
  } catch {
    return null;
  }
  if (typeof claims === "string" || typeof claims.memberId !== "string") return null;

  const [account] = await db.select().from(accounts).where(eq(accounts.memberId, claims.memberId)).limit(1);
  if (!account || account.role !== claims.role) return null;
  return {
    memberId: account.memberId,
    role: account.role,
    status: account.status,
    email: account.email,
    fullName: account.fullName,
  };
}

export function requireApprovedIdentity(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  loadIdentity(header.slice("Bearer ".length))
    .then((identity) => {
      if (!identity) {
        res.status(401).json({ error: "Invalid account session." });
        return;
      }
      if (identity.status !== "approved") {
        res.status(403).json({
          error: identity.status === "pending"
            ? "Your account is awaiting administrator approval."
            : "This account is not eligible to access the library.",
        });
        return;
      }
      req.identity = identity;
      next();
    })
    .catch((error: unknown) => {
      console.error("Account status verification failed", error);
      res.status(503).json({ error: "Account status could not be verified. Please try again." });
    });
}

export function requireLibrarian(req: Request, res: Response, next: NextFunction): void {
  const identity = req.identity;
  if (!identity || identity.role !== "librarian") {
    res.status(403).json({ error: "Administrator access required." });
    return;
  }
  next();
}

export async function getApprovedIdentity(token: string): Promise<AuthenticatedIdentity | null> {
  try {
    const identity = await loadIdentity(token);
    return identity?.status === "approved" ? identity : null;
  } catch (error: unknown) {
    console.error("Socket account status verification failed", error);
    return null;
  }
}

export function verifyServiceToken(token: string): JwtPayload | null {
  try {
    const claims = jwt.verify(token, jwtSecret());
    return typeof claims === "string" ? null : claims;
  } catch {
    return null;
  }
}
