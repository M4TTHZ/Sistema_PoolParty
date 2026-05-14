import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Admin (único usuário do sistema) ─────────────────────────────────────────
export const admin = mysqlTable("admin", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Admin = typeof admin.$inferSelect;
export type InsertAdmin = typeof admin.$inferInsert;


export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 18 }).notNull().unique(),
  birthDate: timestamp("birthDate"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  cep: varchar("cep", { length: 10 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ── Estoque ───────────────────────────────────────────────────────────────
export const stockItems = mysqlTable("stockItems", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StockItem = typeof stockItems.$inferSelect;
export type InsertStockItem = typeof stockItems.$inferInsert;

// ── Reservas ──────────────────────────────────────────────────────────────
// Sem campo de data — datas ficam em reserva_datas
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  rentalPrice: decimal("rentalPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["confirmed", "cancelled", "completed"]).default("confirmed").notNull(),
  observations: text("observations"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0"),
  pdfUrl: varchar("pdfUrl", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ── Datas da Reserva ──────────────────────────────────────────────────────
export const reservationDates = mysqlTable("reservationDates", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull(),
  reservationDate: varchar("reservationDate", { length: 10 }).notNull(), // YYYY-MM-DD
});
export type ReservationDate = typeof reservationDates.$inferSelect;
export type InsertReservationDate = typeof reservationDates.$inferInsert;

// ── Itens da Reserva ──────────────────────────────────────────────────────
export const reservationItems = mysqlTable("reservationItems", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull(),
  stockItemId: int("stockItemId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
});
export type ReservationItem = typeof reservationItems.$inferSelect;
export type InsertReservationItem = typeof reservationItems.$inferInsert;

// ── Brinquedoteca ─────────────────────────────────────────────────────────
export const playgroundRentals = mysqlTable("playgroundRentals", {
  id: int("id").autoincrement().primaryKey(),
  reservationId: int("reservationId").notNull().unique(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});
export type PlaygroundRental = typeof playgroundRentals.$inferSelect;
export type InsertPlaygroundRental = typeof playgroundRentals.$inferInsert;

// ── Manutenção ────────────────────────────────────────────────────────────────
export const maintenances = mysqlTable("maintenances", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 500 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  maintenanceDate: varchar("maintenanceDate", { length: 10 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Maintenance = typeof maintenances.$inferSelect;
export type InsertMaintenance = typeof maintenances.$inferInsert;
