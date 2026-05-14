import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "../utils/logger";
import { globalErrorHandler } from "../utils/errorHandler";

// Dynamic imports for optional security packages
async function loadHelmet() {
  try { return (await import("helmet")).default; } catch { return null; }
}
async function loadRateLimit() {
  try { return (await import("express-rate-limit")).rateLimit; } catch { return null; }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  const helmet = await loadHelmet();
  if (helmet) {
    app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for Vite dev
    logger.info("Helmet security headers enabled");
  }

  // ── Request ID (tracing) ───────────────────────────────────────────────────
  app.use((req, _res, next) => {
    req.headers["x-request-id"] = req.headers["x-request-id"] ?? crypto.randomUUID();
    next();
  });

  // ── Request logger ─────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info({
        method:    req.method,
        url:       req.originalUrl,
        status:    res.statusCode,
        ms:        Date.now() - start,
        requestId: req.headers["x-request-id"],
      }, "HTTP");
    });
    next();
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const rateLimit = await loadRateLimit();
  if (rateLimit) {
    // General API rate limit
    app.use("/api/", rateLimit({
      windowMs:        60 * 1000,   // 1 minute
      max:             300,          // 300 req/min per IP
      standardHeaders: true,
      legacyHeaders:   false,
      message:         { error: { code: "TOO_MANY_REQUESTS", message: "Muitas requisições. Tente novamente em breve." } },
      skip: (req) => process.env.NODE_ENV === "development" && req.ip === "::1",
    }));
    logger.info("Rate limiting enabled (300 req/min)");
  }

  // ── Body parser ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(cookieParser());

  // ── Static uploads ─────────────────────────────────────────────────────────
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── tRPC ───────────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  // ── Frontend ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ── Global error handler (must be last) ────────────────────────────────────
  app.use(globalErrorHandler);

  // ── Start ──────────────────────────────────────────────────────────────────
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) logger.warn(`Port ${preferredPort} busy, using ${port}`);

  server.listen(port, () => {
    logger.info({ port, env: process.env.NODE_ENV }, `Server running on http://localhost:${port}/`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — shutting down gracefully");
    server.close(() => { logger.info("Server closed"); process.exit(0); });
  });
}

startServer().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
