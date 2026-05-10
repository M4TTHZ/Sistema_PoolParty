import { eq } from "drizzle-orm";
import { stockItems, InsertStockItem } from "../../drizzle/schema";
import { getDb } from "./connection";

export const stockRepository = {
  async findAll() {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(stockItems);
  },

  async findById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const r = await db.select().from(stockItems).where(eq(stockItems.id, id)).limit(1);
    return r[0];
  },

  async create(data: InsertStockItem) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.insert(stockItems).values(data);
  },

  async update(id: number, data: Partial<InsertStockItem>) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(stockItems).set(data).where(eq(stockItems.id, id));
  },

  async delete(id: number) {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(stockItems).where(eq(stockItems.id, id));
  },
};
