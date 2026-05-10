import { eq } from "drizzle-orm";
import {
  reservations, InsertReservation,
  reservationDates, InsertReservationDate,
  reservationItems, InsertReservationItem,
  playgroundRentals, InsertPlaygroundRental,
} from "../../drizzle/schema";
import { getDb } from "./connection";

export const reservationRepository = {
  // ── Reservations ──────────────────────────────────────────────────────────
  async findAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reservations);
  },

  async findById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return r[0];
  },

  async create(data: InsertReservation) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(reservations).values(data);
  },

  async update(id: number, data: Partial<InsertReservation>) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(reservations).set(data).where(eq(reservations.id, id));
  },

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(reservations).where(eq(reservations.id, id));
  },

  // ── Dates ─────────────────────────────────────────────────────────────────
  async findAllDates() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reservationDates);
  },

  async findDatesByReservation(reservationId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reservationDates).where(eq(reservationDates.reservationId, reservationId));
  },

  async createDate(data: InsertReservationDate) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(reservationDates).values(data);
  },

  async deleteDatesByReservation(reservationId: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(reservationDates).where(eq(reservationDates.reservationId, reservationId));
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  async findItemsByReservation(reservationId: number) {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reservationItems).where(eq(reservationItems.reservationId, reservationId));
  },

  async createItem(data: InsertReservationItem) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(reservationItems).values(data);
  },

  async deleteItem(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(reservationItems).where(eq(reservationItems.id, id));
  },

  async deleteItemsByReservation(reservationId: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(reservationItems).where(eq(reservationItems.reservationId, reservationId));
  },

  // ── Playground ────────────────────────────────────────────────────────────
  async findAllPlayground() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(playgroundRentals);
  },

  async findPlaygroundByReservation(reservationId: number) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(playgroundRentals).where(eq(playgroundRentals.reservationId, reservationId)).limit(1);
    return r[0];
  },

  async createPlayground(data: InsertPlaygroundRental) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(playgroundRentals).values(data);
  },

  async updatePlayground(id: number, data: Partial<InsertPlaygroundRental>) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(playgroundRentals).set(data).where(eq(playgroundRentals.id, id));
  },

  async deletePlayground(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(playgroundRentals).where(eq(playgroundRentals.id, id));
  },
};
