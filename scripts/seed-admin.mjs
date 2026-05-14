/**
 * Script para criar o usuário administrador.
 * Execute UMA VEZ após o primeiro deploy:
 *
 *   node --env-file=.env scripts/seed-admin.mjs
 *
 * Ou no Docker:
 *   docker compose exec app node scripts/seed-admin.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não configurada no .env");
  process.exit(1);
}

// Credenciais do admin — altere antes de rodar!
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PoolParty@2024!";

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Verifica se já existe admin
    const [rows] = await connection.execute("SELECT id FROM admin LIMIT 1");
    if (Array.isArray(rows) && rows.length > 0) {
      console.log("⚠️  Usuário admin já existe. Nenhuma ação necessária.");
      process.exit(0);
    }

    // Cria admin
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await connection.execute(
      "INSERT INTO admin (username, passwordHash) VALUES (?, ?)",
      [ADMIN_USERNAME, passwordHash]
    );

    console.log("✅ Admin criado com sucesso!");
    console.log(`   Usuário: ${ADMIN_USERNAME}`);
    console.log(`   Senha:   ${ADMIN_PASSWORD}`);
    console.log("\n⚠️  IMPORTANTE: Troque a senha após o primeiro login!");
  } finally {
    await connection.end();
  }
}

seed().catch((e) => {
  console.error("❌ Erro ao criar admin:", e.message);
  process.exit(1);
});
