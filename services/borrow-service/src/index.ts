import express, { NextFunction, Request, Response } from "express";
import { applyMigrations, pool, verifyDatabaseConnection } from "./db";
import routes from "./routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "borrow-service" }));
app.use("/api", routes);
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Borrow request failed: ${req.method} ${req.path}`, error);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8082;

async function start(): Promise<void> {
  try {
    await applyMigrations();
    await verifyDatabaseConnection();
    app.listen(PORT, () => console.log(`borrow-service listening on port ${PORT}`));
  } catch (error: unknown) {
    console.error("Borrow service could not initialize its database", error);
    await pool.end();
    process.exitCode = 1;
  }
}

void start();
