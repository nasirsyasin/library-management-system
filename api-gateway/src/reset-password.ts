import { createInterface } from "node:readline/promises";
import { db, pool } from "./db";
import { hashPassword, validateRegistration } from "./identity";
import { accounts } from "./db/schema";
import { eq } from "drizzle-orm";

function readHidden(prompt: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY) {
    return Promise.reject(new Error("Run this command from an interactive terminal."));
  }

  return new Promise((resolve, reject) => {
    let value = "";
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          finish(new Error("Password reset cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = Array.from(value).slice(0, -1).join("");
        } else if (character >= " ") {
          value += character;
        }
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function resetPassword(): Promise<void> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let email: string;
  try {
    email = (await terminal.question("Account email: ")).trim().toLowerCase();
  } finally {
    terminal.close();
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Enter a valid account email.");
  }

  const [account] = await db.select({
    memberId: accounts.memberId,
    role: accounts.role,
    status: accounts.status,
  }).from(accounts).where(eq(accounts.email, email)).limit(1);

  if (!account) throw new Error("No account matches that email.");

  process.stdout.write(`Account found (${account.role}, ${account.status}).\n`);
  const newPassword = await readHidden("New password (input hidden): ");
  const confirmPassword = await readHidden("Confirm new password (input hidden): ");

  if (newPassword !== confirmPassword) {
    throw new Error("The password entries do not match.");
  }

  const validation = validateRegistration({
    fullName: "Password Reset",
    email,
    password: newPassword,
  });
  if (!validation.value) {
    throw new Error(validation.error ?? "The new password does not meet the requirements.");
  }

  const confirmation = createInterface({ input: process.stdin, output: process.stdout });
  let confirmationText: string;
  try {
    confirmationText = await confirmation.question(
      'Type RESET to update this account password: ',
    );
  } finally {
    confirmation.close();
  }
  if (confirmationText !== "RESET") {
    throw new Error("Password reset cancelled; no changes were made.");
  }

  await db.update(accounts)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(accounts.memberId, account.memberId));

  process.stdout.write("Password updated. Sign in with the new password.\n");
}

resetPassword()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unexpected reset error.";
    console.error(`Password reset failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
