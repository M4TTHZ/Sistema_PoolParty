import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "../repositories/connection";
import { admin } from "../../drizzle/schema";
import { logger } from "../utils/logger";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "poolparty-dev-secret-change-in-production"
);
const JWT_EXPIRES = "7d";
const COOKIE_NAME = "pp_auth";

// ── Password ──────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ───────────────────────────────────────────────────────────────────
export async function signToken(payload: { id: number; username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; username: string; exp: number };
  } catch {
    return null;
  }
}

// ── Admin DB helpers ──────────────────────────────────────────────────────
export async function getAdminUser() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(admin).limit(1);
  return result[0] ?? null;
}

export async function createAdminUser(username: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const existing = await getAdminUser();
  if (existing) throw new Error("Admin já existe. Apenas um administrador é permitido.");

  const passwordHash = await hashPassword(password);
  await db.insert(admin).values({ username, passwordHash });
  logger.info({ username }, "Admin criado com sucesso");
}

// ── Cookie helpers ────────────────────────────────────────────────────────
export const AUTH_COOKIE = COOKIE_NAME;

export function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
