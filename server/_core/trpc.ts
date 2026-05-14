import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { routerLogger } from "../utils/logger";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Logs every tRPC request + errors */
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  if (result.ok) {
    routerLogger.debug({ path, type, durationMs }, "tRPC OK");
  } else {
    routerLogger.error({ path, type, durationMs, err: result.error }, "tRPC ERROR");
  }
  return result;
});

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Acesso não autorizado. Faça login." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(loggerMiddleware).use(requireAuth);
export const protectedPublicProcedure = t.procedure.use(loggerMiddleware);
export const adminProcedure = protectedProcedure; // único usuário é sempre admin
