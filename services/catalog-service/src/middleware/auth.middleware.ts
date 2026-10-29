import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    secret === "change-me" ||
    secret === "replace-with-a-long-random-secret" ||
    secret === "replace-this-with-a-random-secret-of-at-least-32-characters"
  ) {
    throw new Error("JWT_SECRET must be a unique, non-placeholder value of at least 32 characters");
  }
  return secret;
}

// Identity and Access is handled at the API Gateway (OAuth2 login, JWT
// issuing). Each downstream service only verifies the token the gateway
// forwards and trusts its claims (memberId / role) — resource-server style.
export function issueToken(memberId: string, role: "member" | "librarian") {
  return jwt.sign({ memberId, role }, getJwtSecret(), { expiresIn: "12h" });
}

export function issueServiceToken(service: string) {
  return jwt.sign({ service }, getJwtSecret(), { expiresIn: "1m" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });
  try {
    const token = header.replace("Bearer ", "");
    (req as any).user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

export function requireService(service: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ error: "Missing service token" });

    try {
      const token = header.replace("Bearer ", "");
      const claims = jwt.verify(token, getJwtSecret());
      if (typeof claims === "string" || claims.service !== service) {
        return res.status(403).json({ error: "Forbidden" });
      }
      (req as any).service = claims;
      next();
    } catch {
      res.status(401).json({ error: "Invalid service token" });
    }
  };
}
