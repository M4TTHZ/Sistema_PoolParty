import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllReservations, getReservationById, createReservation, updateReservation, deleteReservation,
  getReservationDates, getAllReservationDates, createReservationDate, deleteReservationDates,
  getReservationItems, createReservationItem, deleteReservationItems,
  getAllPlaygroundRentals, getPlaygroundRentalByReservationId,
  createPlaygroundRental, updatePlaygroundRental, deletePlaygroundRental,
  getClientById, getStockItemById,
} from "../db";
import { generateReservationPdf } from "../services/pdfService";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const itemSchema = z.object({
  stockItemId: z.number().int().positive(),
  quantity: z.number().int().min(1),
});

const playgroundSchema = z.object({
  startTime: z.string().regex(timeRegex, "Horário inválido (HH:MM)"),
  endTime:   z.string().regex(timeRegex, "Horário inválido (HH:MM)"),
  price:     z.coerce.number().nonnegative(),
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Recalculate and persist totalAmount = rentalPrice + items + playground */
async function recalcTotal(reservationId: number) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) return;
  const items = await getReservationItems(reservationId);
  const pg    = await getPlaygroundRentalByReservationId(reservationId);
  const rentalPrice = parseFloat(String(reservation.rentalPrice ?? "0"));
  const itemsTotal  = items.reduce((s, i) => s + parseFloat(String(i.totalPrice)), 0);
  const pgTotal     = pg ? parseFloat(String(pg.price)) : 0;
  await updateReservation(reservationId, { totalAmount: (rentalPrice + itemsTotal + pgTotal).toFixed(2) });
}

/** Check playground time conflict — excludes the reservation being edited */
async function checkPlaygroundConflict(
  startTime: string,
  endTime: string,
  dates: string[],
  excludeReservationId?: number,
) {
  const allDates        = await getAllReservationDates();
  const allPg           = await getAllPlaygroundRentals();
  const allReservations = await getAllReservations();

  for (const pg of allPg) {
    if (excludeReservationId && pg.reservationId === excludeReservationId) continue;

    const res = allReservations.find((r) => r.id === pg.reservationId);
    if (!res || res.status === "cancelled") continue;

    const pgDates    = allDates.filter((d) => d.reservationId === pg.reservationId).map((d) => d.reservationDate);
    const sharedDate = dates.some((d) => pgDates.includes(d));
    if (!sharedDate) continue;

    const overlaps = startTime < pg.endTime && pg.startTime < endTime;
    if (overlaps) {
      throw new TRPCError({
        code:    "CONFLICT",
        message: `Conflito de horário na brinquedoteca: já existe reserva das ${pg.startTime} às ${pg.endTime} nessa data.`,
      });
    }
  }
}

// ── Router ─────────────────────────────────────────────────────────────────
export const reservationsRouter = router({

  /** Full list with dates attached */
  list: publicProcedure.query(async () => {
    const all      = await getAllReservations();
    const allDates = await getAllReservationDates();
    return all.map((r) => ({
      ...r,
      dates: allDates
        .filter((d) => d.reservationId === r.id)
        .map((d) => d.reservationDate as string),
    }));
  }),

  /** All non-cancelled reserved dates (used by calendar to block days) */
  reservedDates: publicProcedure.query(async () => {
    const dates    = await getAllReservationDates();
    const allRes   = await getAllReservations();
    const cancelled = new Set(allRes.filter((r) => r.status === "cancelled").map((r) => r.id));
    return dates
      .filter((d) => !cancelled.has(d.reservationId))
      .map((d) => d.reservationDate as string);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const r = await getReservationById(input.id);
      if (!r) return null;
      const [dates, items, playground] = await Promise.all([
        getReservationDates(input.id),
        getReservationItems(input.id),
        getPlaygroundRentalByReservationId(input.id),
      ]);
      return {
        ...r,
        dates:      dates.map((d) => d.reservationDate as string),
        items,
        playground: playground ?? null,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      clientId:     z.number().int().positive(),
      dates:        z.array(z.string().regex(dateRegex, "Data inválida")).min(1, "Selecione ao menos uma data"),
      rentalPrice:  z.coerce.number().nonnegative(),
      observations: z.string().max(1000).optional(),
      items:        z.array(itemSchema).optional(),
      playground:   playgroundSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      // Validate client
      const client = await getClientById(input.clientId);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });

      const uniqueDates = [...new Set(input.dates)];

      // Resolve item prices (no stock deduction)
      const resolvedItems: Array<{ stockItemId: number; quantity: number; unitPrice: string; totalPrice: string }> = [];
      for (const item of input.items ?? []) {
        const stock = await getStockItemById(item.stockItemId);
        if (!stock) throw new TRPCError({ code: "NOT_FOUND", message: `Item #${item.stockItemId} não encontrado.` });
        const unitPrice  = parseFloat(String(stock.unitPrice));
        const totalPrice = unitPrice * item.quantity;
        resolvedItems.push({
          stockItemId: item.stockItemId,
          quantity:    item.quantity,
          unitPrice:   unitPrice.toFixed(2),
          totalPrice:  totalPrice.toFixed(2),
        });
      }

      // Validate playground time and conflict
      if (input.playground) {
        if (input.playground.startTime >= input.playground.endTime)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Horário de início da brinquedoteca deve ser anterior ao término." });
        await checkPlaygroundConflict(input.playground.startTime, input.playground.endTime, uniqueDates);
      }

      // Create reservation
      const result = await createReservation({
        clientId:    input.clientId,
        rentalPrice: input.rentalPrice.toFixed(2),
        observations: input.observations,
        status:      "confirmed",
        totalAmount: "0",
      });
      const reservationId = (result as unknown as [{ insertId: number }])[0].insertId;

      // Insert dates
      for (const dateStr of uniqueDates) {
        await createReservationDate({ reservationId, reservationDate: dateStr });
      }

      // Insert items (no stock deduction)
      for (const item of resolvedItems) {
        await createReservationItem({ reservationId, ...item });
      }

      // Insert playground rental
      if (input.playground) {
        await createPlaygroundRental({
          reservationId,
          startTime: input.playground.startTime,
          endTime:   input.playground.endTime,
          price:     input.playground.price.toFixed(2),
        });
      }

      await recalcTotal(reservationId);

      // Generate PDF asynchronously — does NOT block reservation creation
      const reservation = await getReservationById(reservationId);
      if (reservation && client) {
        const savedItems   = await getReservationItems(reservationId);
        const playground   = await getPlaygroundRentalByReservationId(reservationId);
        const stockDetails = await Promise.all(savedItems.map((i) => getStockItemById(i.stockItemId)));

        const pdfUrl = await generateReservationPdf({
          reservation: { ...reservation, createdAt: new Date() },
          client,
          dates: uniqueDates,
          items: savedItems.map((item, idx) => ({
            name:       stockDetails[idx]?.name ?? `Item #${item.stockItemId}`,
            quantity:   item.quantity,
            unitPrice:  item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          playground: playground
            ? { startTime: playground.startTime, endTime: playground.endTime, price: playground.price }
            : null,
        });

        if (pdfUrl) await updateReservation(reservationId, { pdfUrl });
      }

      return getReservationById(reservationId);
    }),

  update: protectedProcedure
    .input(z.object({
      id:           z.number().int().positive(),
      status:       z.enum(["confirmed", "cancelled", "completed"]).optional(),
      observations: z.string().max(1000).optional(),
      dates:        z.array(z.string().regex(dateRegex)).min(1).optional(),
      rentalPrice:  z.coerce.number().nonnegative().optional(),
      items:        z.array(itemSchema).optional(),
      playground:   playgroundSchema.nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, dates, items, playground, rentalPrice, ...core } = input;

      const existing = await getReservationById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Reserva não encontrada." });

      // Core fields update
      const coreUpdate: Record<string, unknown> = { ...core };
      if (rentalPrice !== undefined) coreUpdate.rentalPrice = rentalPrice.toFixed(2);
      if (Object.keys(coreUpdate).length) await updateReservation(id, coreUpdate);

      // Replace dates
      if (dates !== undefined) {
        const uniqueDates = [...new Set(dates)];
        await deleteReservationDates(id);
        for (const d of uniqueDates) await createReservationDate({ reservationId: id, reservationDate: d });
      }

      // Replace items (no stock manipulation)
      if (items !== undefined) {
        await deleteReservationItems(id);
        for (const item of items) {
          const stock = await getStockItemById(item.stockItemId);
          if (!stock) throw new TRPCError({ code: "NOT_FOUND", message: `Item #${item.stockItemId} não encontrado.` });
          const unitPrice  = parseFloat(String(stock.unitPrice));
          const totalPrice = unitPrice * item.quantity;
          await createReservationItem({
            reservationId: id,
            stockItemId:   item.stockItemId,
            quantity:      item.quantity,
            unitPrice:     unitPrice.toFixed(2),
            totalPrice:    totalPrice.toFixed(2),
          });
        }
      }

      // Update playground
      if (playground !== undefined) {
        const currentDates = dates
          ? [...new Set(dates)]
          : (await getReservationDates(id)).map((d) => d.reservationDate as string);
        const ep = await getPlaygroundRentalByReservationId(id);

        if (playground === null) {
          if (ep) await deletePlaygroundRental(ep.id);
        } else {
          if (playground.startTime >= playground.endTime)
            throw new TRPCError({ code: "BAD_REQUEST", message: "Horário de início da brinquedoteca deve ser anterior ao término." });
          await checkPlaygroundConflict(playground.startTime, playground.endTime, currentDates, id);
          if (ep) {
            await updatePlaygroundRental(ep.id, {
              startTime: playground.startTime,
              endTime:   playground.endTime,
              price:     playground.price.toFixed(2),
            });
          } else {
            await createPlaygroundRental({
              reservationId: id,
              startTime:     playground.startTime,
              endTime:       playground.endTime,
              price:         playground.price.toFixed(2),
            });
          }
        }
      }

      await recalcTotal(id);
      return getReservationById(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await getReservationById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Reserva não encontrada." });

      // Delete all child records, then the reservation (no stock restoration)
      await deleteReservationDates(input.id);
      await deleteReservationItems(input.id);
      const pg = await getPlaygroundRentalByReservationId(input.id);
      if (pg) await deletePlaygroundRental(pg.id);
      await deleteReservation(input.id);
      return { success: true };
    }),
});
