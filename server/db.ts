import { eq, and, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertClient, clients,
  InsertStockItem, stockItems,
  InsertReservation, reservations,
  InsertReservationDate, reservationDates,
  InsertReservationItem, reservationItems,
  InsertPlaygroundRental, playgroundRentals,
  maintenances, InsertMaintenance,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { dbLogger } from "./utils/logger";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      dbLogger.debug("DB connection ready");
    } catch (e) {
      dbLogger.error({ err: e }, "DB connection failed");
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("openId required");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const f of ["name", "email", "loginMethod"] as const) {
    if (user[f] !== undefined) { values[f] = user[f] ?? null; updateSet[f] = user[f] ?? null; }
  }
  if (user.lastSignedIn) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0];
}

// ── Clients ────────────────────────────────────────────────────────────────
export async function getAllClients() { const db = await getDb(); if (!db) return []; return db.select().from(clients); }
export async function getClientById(id: number) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(clients).where(eq(clients.id, id)).limit(1); return r[0]; }
export async function getClientByCpfCnpj(cpfCnpj: string) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(clients).where(eq(clients.cpfCnpj, cpfCnpj)).limit(1); return r[0]; }
export async function createClient(c: InsertClient) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(clients).values(c); }
export async function updateClient(id: number, u: Partial<InsertClient>) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.update(clients).set(u).where(eq(clients.id, id)); }
export async function deleteClient(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(clients).where(eq(clients.id, id)); }

// ── Stock ──────────────────────────────────────────────────────────────────
export async function getAllStockItems() { const db = await getDb(); if (!db) return []; return db.select().from(stockItems); }
export async function getStockItemById(id: number) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(stockItems).where(eq(stockItems.id, id)).limit(1); return r[0]; }
export async function createStockItem(i: InsertStockItem) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(stockItems).values(i); }
export async function updateStockItem(id: number, u: Partial<InsertStockItem>) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.update(stockItems).set(u).where(eq(stockItems.id, id)); }
export async function deleteStockItem(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(stockItems).where(eq(stockItems.id, id)); }

// ── Reservations ───────────────────────────────────────────────────────────
export async function getAllReservations() { const db = await getDb(); if (!db) return []; return db.select().from(reservations); }
export async function getReservationById(id: number) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1); return r[0]; }
export async function createReservation(r: InsertReservation) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(reservations).values(r); }
export async function updateReservation(id: number, u: Partial<InsertReservation>) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.update(reservations).set(u).where(eq(reservations.id, id)); }
export async function deleteReservation(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(reservations).where(eq(reservations.id, id)); }

// ── Reservation Dates ──────────────────────────────────────────────────────
export async function getReservationDates(reservationId: number) { const db = await getDb(); if (!db) return []; return db.select().from(reservationDates).where(eq(reservationDates.reservationId, reservationId)); }
export async function getAllReservationDates() { const db = await getDb(); if (!db) return []; return db.select().from(reservationDates); }
export async function createReservationDate(d: InsertReservationDate) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(reservationDates).values(d); }
export async function deleteReservationDates(reservationId: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(reservationDates).where(eq(reservationDates.reservationId, reservationId)); }

// ── Reservation Items ──────────────────────────────────────────────────────
export async function getReservationItems(reservationId: number) { const db = await getDb(); if (!db) return []; return db.select().from(reservationItems).where(eq(reservationItems.reservationId, reservationId)); }
export async function createReservationItem(i: InsertReservationItem) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(reservationItems).values(i); }
export async function deleteReservationItem(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(reservationItems).where(eq(reservationItems.id, id)); }
export async function deleteReservationItems(reservationId: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(reservationItems).where(eq(reservationItems.reservationId, reservationId)); }

// ── Playground Rentals ─────────────────────────────────────────────────────
export async function getAllPlaygroundRentals() { const db = await getDb(); if (!db) return []; return db.select().from(playgroundRentals); }
export async function getPlaygroundRentalByReservationId(reservationId: number) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(playgroundRentals).where(eq(playgroundRentals.reservationId, reservationId)).limit(1); return r[0]; }
export async function createPlaygroundRental(r: InsertPlaygroundRental) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(playgroundRentals).values(r); }
export async function updatePlaygroundRental(id: number, u: Partial<InsertPlaygroundRental>) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.update(playgroundRentals).set(u).where(eq(playgroundRentals.id, id)); }
export async function deletePlaygroundRental(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(playgroundRentals).where(eq(playgroundRentals.id, id)); }

// ── Maintenance ────────────────────────────────────────────────────────────
import { maintenances, InsertMaintenance } from "../drizzle/schema";
export async function getAllMaintenances() { const db = await getDb(); if (!db) return []; return db.select().from(maintenances).orderBy(maintenances.maintenanceDate); }
export async function getMaintenanceById(id: number) { const db = await getDb(); if (!db) return undefined; const r = await db.select().from(maintenances).where(eq(maintenances.id, id)).limit(1); return r[0]; }
export async function createMaintenance(m: InsertMaintenance) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); return db.insert(maintenances).values(m); }
export async function updateMaintenance(id: number, u: Partial<InsertMaintenance>) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.update(maintenances).set(u).where(eq(maintenances.id, id)); }
export async function deleteMaintenance(id: number) { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(maintenances).where(eq(maintenances.id, id)); }
