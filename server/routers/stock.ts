import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
} from "../db";

export const stockRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllStockItems();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const item = await getStockItemById(input.id);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado." });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome obrigatório").max(255),
        quantity: z.number().int().min(0, "Quantidade não pode ser negativa"),
        unitPrice: z.coerce.number().nonnegative("Preço não pode ser negativo"),
      }),
    )
    .mutation(async ({ input }) => {
      return createStockItem({
        name: input.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice.toFixed(2),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        quantity: z.number().int().min(0).optional(),
        unitPrice: z.coerce.number().nonnegative().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, unitPrice, ...rest } = input;

      const existing = await getStockItemById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado." });
      }

      const updates: Record<string, unknown> = { ...rest };
      if (unitPrice !== undefined) updates.unitPrice = unitPrice.toFixed(2);

      await updateStockItem(id, updates);
      return getStockItemById(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await getStockItemById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado." });
      }
      await deleteStockItem(input.id);
      return { success: true };
    }),
});
