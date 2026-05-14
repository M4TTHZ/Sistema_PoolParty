import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAdminUser, verifyPassword, signToken,
  AUTH_COOKIE, getCookieOptions,
  verifyToken,
} from "../services/authService";
import { routerLogger } from "../utils/logger";

export const authRouter = router({

  /** Login — valida credenciais e seta cookie httpOnly */
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1, "Usuário obrigatório").max(64),
      password: z.string().min(1, "Senha obrigatória").max(128),
    }))
    .mutation(async ({ input, ctx }) => {
      const adminUser = await getAdminUser();

      // Mensagem genérica para não revelar se o usuário existe
      const INVALID = "Usuário ou senha inválidos.";

      if (!adminUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID });
      }

      const validPassword = await verifyPassword(input.password, adminUser.passwordHash);
      if (!validPassword) {
        routerLogger.warn({ username: input.username }, "Tentativa de login inválida");
        throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID });
      }

      const token = await signToken({ id: adminUser.id, username: adminUser.username });

      // Seta cookie httpOnly (7 dias)
      ctx.res.cookie(AUTH_COOKIE, token, getCookieOptions(60 * 60 * 24 * 7));

      routerLogger.info({ username: adminUser.username }, "Login realizado");

      return {
        user: { id: adminUser.id, username: adminUser.username },
        token,
      };
    }),

  /** Retorna usuário autenticado pelo cookie */
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[AUTH_COOKIE];
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const adminUser = await getAdminUser();
    if (!adminUser || adminUser.id !== payload.id) return null;

    return { id: adminUser.id, username: adminUser.username };
  }),

  /** Logout — limpa o cookie */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(AUTH_COOKIE, getCookieOptions(0));
    return { success: true };
  }),
});
