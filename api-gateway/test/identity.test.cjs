process.env.GATEWAY_DATABASE_URL ||= "postgresql://identity-test:identity-test@127.0.0.1:1/identity-test";
process.env.JWT_SECRET ||= "unit-test-secret-that-is-at-least-thirty-two-characters";

const assert = require("node:assert/strict");
const { after, describe, it } = require("node:test");
const {
  hashPassword,
  getLoginStatusError,
  pool,
  validateLogin,
  validateRegistration,
  verifyPassword,
} = (() => {
  const identity = require("../dist/identity.js");
  return { ...identity, pool: require("../dist/db/index.js").pool };
})();

after(async () => pool.end());

describe("identity validation", () => {
  it("accepts valid member details and ignores client-supplied role and status", () => {
    const result = validateRegistration({
      fullName: "  Alex Member ",
      email: "  Alex@Example.com ",
      password: "LibraryPassword2026",
      role: "librarian",
      status: "approved",
    });

    assert.deepEqual(result.value, {
      fullName: "Alex Member",
      email: "alex@example.com",
      password: "LibraryPassword2026",
      phone: null,
      address: null,
    });
    assert.equal("role" in result.value, false);
    assert.equal("status" in result.value, false);
  });

  it("rejects missing names, invalid emails, and weak or oversized passwords", () => {
    assert.match(validateRegistration({ email: "alex@example.com", password: "LibraryPassword2026" }).error, /full name/i);
    assert.match(validateRegistration({ fullName: "Alex", email: "not-an-email", password: "LibraryPassword2026" }).error, /email/i);
    assert.match(validateRegistration({ fullName: "Alex", email: "alex@example.com", password: "short" }).error, /password/i);
    assert.match(validateRegistration({ fullName: "Alex", email: "alex@example.com", password: `Aa1${"x".repeat(126)}` }).error, /password/i);
    assert.equal(validateRegistration(null).value, undefined);
  });

  it("normalizes login email and rejects malformed credentials", () => {
    assert.deepEqual(validateLogin({ email: " Alex@Example.com ", password: "a-password" }), {
      email: "alex@example.com",
      password: "a-password",
    });
    assert.equal(validateLogin({ email: "bad-email", password: "password" }), null);
    assert.equal(validateLogin({ email: "alex@example.com", password: "x".repeat(129) }), null);
  });

  it("returns safe status messages for pending and rejected accounts only", () => {
    assert.equal(getLoginStatusError("pending"), "Your account is awaiting administrator approval.");
    assert.equal(getLoginStatusError("rejected"), "This account is not eligible to sign in.");
    assert.equal(getLoginStatusError("approved"), null);
  });
});

describe("password storage", () => {
  it("stores a salted scrypt digest and verifies it without storing plaintext", async () => {
    const password = "LibraryPassword2026";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    assert.match(firstHash, /^scrypt\$/);
    assert.notEqual(firstHash, password);
    assert.notEqual(firstHash, secondHash);
    assert.equal(await verifyPassword(password, firstHash), true);
    assert.equal(await verifyPassword("wrong-password", firstHash), false);
    assert.equal(await verifyPassword(password, "plaintext"), false);
  });
});
