import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { clientsRouter } from "./routers/clients";
import { stockRouter } from "./routers/stock";
import { reservationsRouter } from "./routers/reservations";
import { maintenanceRouter } from "./routers/maintenance";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  clients: clientsRouter,
  stock: stockRouter,
  reservations: reservationsRouter,
  maintenance: maintenanceRouter,
});

export type AppRouter = typeof appRouter;
