import { drizzle } from "drizzle-orm/mysql2";
import { dbLogger } from "../utils/logger";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      dbLogger.debug("Database connection established");
    } catch (e) {
      dbLogger.error({ err: e }, "Database connection failed");
    }
  }
  return _db;
}
