import { eq } from "drizzle-orm";
import { maintenances, InsertMaintenance } from "../../drizzle/schema";
import { getDb } from "./connection";

export const maintenanceRepository = {
  async findAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(maintenances).orderBy(maintenances.maintenanceDate);
  },

  async findById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(maintenances).where(eq(maintenances.id, id)).limit(1);
    return r[0];
  },

  async create(data: InsertMaintenance) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(maintenances).values(data);
  },

  async update(id: number, data: Partial<InsertMaintenance>) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(maintenances).set(data).where(eq(maintenances.id, id));
  },

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(maintenances).where(eq(maintenances.id, id));
  },
};
