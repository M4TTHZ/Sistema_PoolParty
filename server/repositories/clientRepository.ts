import { eq } from "drizzle-orm";
import { clients, InsertClient } from "../../drizzle/schema";
import { getDb } from "./connection";

export const clientRepository = {
  async findAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(clients);
  },

  async findById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return r[0];
  },

  async findByCpfCnpj(cpfCnpj: string) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(clients).where(eq(clients.cpfCnpj, cpfCnpj)).limit(1);
    return r[0];
  },

  async create(data: InsertClient) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(clients).values(data);
  },

  async update(id: number, data: Partial<InsertClient>) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(clients).set(data).where(eq(clients.id, id));
  },

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(clients).where(eq(clients.id, id));
  },
};
