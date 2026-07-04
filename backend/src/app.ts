/**
 * src/app.ts
 * ─────────────────────────────────────────────────────
 * Express application setup.
 * Wires together middleware and all routes.
 * Separated from server.ts so it can be tested independently.
 */
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth";
import teamRoutes from "./routes/teams";
import projectRoutes from "./routes/projects";
import entryRoutes from "./routes/entries";
import bugRoutes from "./routes/bugs";
import knowledgeRoutes from "./routes/knowledge";
import chatRoutes from "./routes/chat";
import adminRoutes from "./routes/admin";

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth: login, register, register-leader, /me
app.use("/api/auth", authRoutes);

// Super admin dashboard
app.use("/api/admin", adminRoutes);

// Teams + member management
app.use("/api/teams", teamRoutes);

// Projects (nested under teams)
app.use("/api/teams/:teamId/projects", projectRoutes);

// Entries (nested under teams > projects)
app.use(
  "/api/teams/:teamId/projects/:projectId/entries",
  entryRoutes
);

// Bug reports (nested under teams > projects)
app.use(
  "/api/teams/:teamId/projects/:projectId/bugs",
  bugRoutes
);

// Knowledge links (nested under teams)
app.use("/api/teams/:teamId/knowledge", knowledgeRoutes);

// Chat messages (nested under teams > projects)
app.use(
  "/api/teams/:teamId/projects/:projectId/chat",
  chatRoutes
);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);

  // Handle known Prisma errors with friendly messages
  if (err.message.includes("Unique constraint")) {
    res.status(409).json({ error: "A record with this data already exists" });
    return;
  }

  if (err.message.includes("Record to delete does not exist")) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  // Generic error (don't leak stack traces in production)
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

export default app;
