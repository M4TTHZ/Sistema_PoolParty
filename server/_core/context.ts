import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyToken, getAdminUser, AUTH_COOKIE } from "../services/authService";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: { id: number; username: string; role: "admin" } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const token = opts.req.cookies?.[AUTH_COOKIE];

  if (!token) {
    return { req: opts.req, res: opts.res, user: null };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { req: opts.req, res: opts.res, user: null };
  }

  const adminUser = await getAdminUser();
  if (!adminUser || adminUser.id !== payload.id) {
    return { req: opts.req, res: opts.res, user: null };
  }

  return {
    req: opts.req,
    res: opts.res,
    user: { id: adminUser.id, username: adminUser.username, role: "admin" },
  };
}
