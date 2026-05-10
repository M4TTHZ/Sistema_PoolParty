import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../db";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const maintenanceInputSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(500),
  value: z.coerce.number().nonnegative("Valor não pode ser negativo"),
  maintenanceDate: z
    .string()
    .regex(dateRegex, "Data inválida (YYYY-MM-DD)"),
});

export const maintenanceRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllMaintenances();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const item = await getMaintenanceById(input.id);
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada." });
      return item;
    }),

  create: protectedProcedure
    .input(maintenanceInputSchema)
    .mutation(async ({ input }) => {
      return createMaintenance({
        description: input.description,
        value: input.value.toFixed(2),
        maintenanceDate: input.maintenanceDate,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        description: z.string().min(1).max(500).optional(),
        value: z.coerce.number().nonnegative().optional(),
        maintenanceDate: z.string().regex(dateRegex).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, value, ...rest } = input;
      const existing = await getMaintenanceById(id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada." });

      const updates: Record<string, unknown> = { ...rest };
      if (value !== undefined) updates.value = value.toFixed(2);

      await updateMaintenance(id, updates);
      return getMaintenanceById(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await getMaintenanceById(input.id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada." });
      await deleteMaintenance(input.id);
      return { success: true };
    }),
});
