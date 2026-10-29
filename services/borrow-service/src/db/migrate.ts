import { applyMigrations, pool } from "./index";

async function main(): Promise<void> {
  try {
    await applyMigrations();
    console.log("Borrow database migrations are up to date");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Borrow database migration failed", error);
  process.exitCode = 1;
});
