import type { Request, Response, NextFunction } from "express";
import { TRPCError } from "@trpc/server";
import { logger } from "./logger";
import { ZodError } from "zod";

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

/** Map TRPC error codes → HTTP status */
const TRPC_STATUS: Record<string, number> = {
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  PRECONDITION_FAILED:   412,
  PAYLOAD_TOO_LARGE:     413,
  METHOD_NOT_SUPPORTED:  405,
  TOO_MANY_REQUESTS:     429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED:       501,
  BAD_GATEWAY:           502,
  SERVICE_UNAVAILABLE:   503,
};

/** Central error response builder */
export function buildErrorResponse(err: unknown, requestId?: string): ApiError {
  if (err instanceof TRPCError) {
    return {
      status:  TRPC_STATUS[err.code] ?? 500,
      code:    err.code,
      message: err.message,
      requestId,
    };
  }

  if (err instanceof ZodError) {
    return {
      status:  400,
      code:    "VALIDATION_ERROR",
      message: "Dados inválidos.",
      details: err.flatten().fieldErrors,
      requestId,
    };
  }

  if (err instanceof Error) {
    return {
      status:  500,
      code:    "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "Erro interno do servidor." : err.message,
      requestId,
    };
  }

  return {
    status:  500,
    code:    "UNKNOWN_ERROR",
    message: "Erro desconhecido.",
    requestId,
  };
}

/** Express global error middleware (must be registered last) */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
  const errorResponse = buildErrorResponse(err, requestId);

  logger.error({
    requestId,
    method:  req.method,
    url:     req.originalUrl,
    status:  errorResponse.status,
    code:    errorResponse.code,
    message: errorResponse.message,
    err,
  }, "Unhandled request error");

  res.status(errorResponse.status).json({ error: errorResponse });
}

/** Wrap async route handlers so errors propagate to globalErrorHandler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
