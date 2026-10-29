import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireApprovedIdentity, issueToken } from "../auth";
import {
  authenticatePassword,
  createMember,
  getLoginStatusError,
  validateLogin,
  validateRegistration,
} from "../identity";

export const authRouter = Router();

function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  const cause = "cause" in error ? error.cause : null;
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
}

// const authRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 10,
//   standardHeaders: "draft-7",
//   legacyHeaders: false,
//   message: { error: "Too many attempts. Please try again later." },
// });
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT ?? 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

authRouter.post("/register", authRateLimit, async (req, res) => {
  const validation = validateRegistration(req.body);
  if (!validation.value) {
    res.status(400).json({ error: validation.error });
    return;
  }
  try {
    await createMember(validation.value);
    res.status(201).json({
      message: "Your registration has been submitted and is awaiting administrator approval.",
    });
  } catch (error: unknown) {
    if (isUniqueConstraintViolation(error)) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    console.error("Member registration failed", error);
    res.status(500).json({ error: "Registration could not be completed. Please try again." });
  }
});

authRouter.post("/login", authRateLimit, async (req, res) => {
  const credentials = validateLogin(req.body);
  if (!credentials) {
    res.status(400).json({ error: "Enter a valid email address and password." });
    return;
  }
  try {
    const result = await authenticatePassword(credentials.email, credentials.password);
    if (result.kind === "pending" || result.kind === "rejected") {
      res.status(403).json({ error: getLoginStatusError(result.kind) });
      return;
    }
    if (result.kind === "invalid") {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const { account } = result;
    res.json({
      token: issueToken({
        memberId: account.memberId,
        role: account.role,
        email: account.email,
        fullName: account.fullName,
      }),
    });
  } catch (error: unknown) {
    console.error("Account login failed", error);
    res.status(500).json({ error: "Login could not be completed. Please try again." });
  }
});

authRouter.get("/me", requireApprovedIdentity, async (req, res) => {
  const identity = req.identity;
  if (!identity) {
    res.status(401).json({ error: "Invalid account session." });
    return;
  }
  res.json({
    memberId: identity.memberId,
    role: identity.role,
    email: identity.email,
    fullName: identity.fullName,
  });
});
