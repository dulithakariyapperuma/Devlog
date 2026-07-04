/**
 * src/server.ts
 * ─────────────────────────────────────────────────────
 * HTTP server entry point.
 * Starts the Express app and connects to the database.
 */
import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  // Verify database connection before accepting traffic
  try {
    await prisma.$connect();
    console.log("✅  Database connected");
  } catch (err) {
    console.error("❌  Failed to connect to database:", err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀  Devlog API running at http://localhost:${PORT}`);
    console.log(`📋  Health check: http://localhost:${PORT}/health`);
    console.log(`🌍  Environment: ${process.env.NODE_ENV ?? "development"}`);
  });

  // Graceful shutdown — close DB connection on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("✅  Database disconnected. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
