import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Usuário local fixo para desenvolvimento sem OAuth
const LOCAL_DEV_USER: User = {
  id: 1,
  openId: "local-dev",
  name: "Usuário Local",
  email: "dev@localhost",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Em desenvolvimento local (sem OAuth configurado), usa usuário fixo
  if (!process.env.OAUTH_SERVER_URL) {
    return {
      req: opts.req,
      res: opts.res,
      user: LOCAL_DEV_USER,
    };
  }

  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
