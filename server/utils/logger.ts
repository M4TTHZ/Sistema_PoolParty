import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: { service: "poolparty-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
      censor: "[REDACTED]",
    },
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname,service",
        },
      })
    : undefined,
);

// Domain-scoped child loggers
export const dbLogger         = logger.child({ module: "db" });
export const routerLogger     = logger.child({ module: "router" });
export const pdfLogger        = logger.child({ module: "pdf" });
export const maintenanceLogger = logger.child({ module: "maintenance" });
