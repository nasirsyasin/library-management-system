import express, { NextFunction, Request, Response } from "express";
import { applyMigrations, pool, verifyDatabaseConnection } from "./db";
import { getJwtSecret } from "./middleware/auth.middleware";
import routes from "./routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "catalog-service" }));
app.use("/api", routes);
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Catalog request failed: ${req.method} ${req.path}`, error);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8081;

async function start(): Promise<void> {
  try {
    getJwtSecret();
    await applyMigrations();
    await verifyDatabaseConnection();
    app.listen(PORT, () => console.log(`catalog-service listening on port ${PORT}`));
  } catch (error: unknown) {
    console.error("Catalog service could not start", error);
    await pool.end();
    process.exitCode = 1;
  }
}

void start();
