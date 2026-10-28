import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "../src/lib/password.mjs";

const email = process.env.EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.PASSWORD ?? "";
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Set EMAIL to the account address.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Set PASSWORD to at least 8 characters.");
  process.exit(1);
}

const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(schema);
  const created = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING email",
    [email, await hashPassword(password)],
  );
  if (!created.rows[0]) {
    console.error("That email already has an account.");
    process.exit(1);
  }
  console.log(`Created account ${created.rows[0].email}`);
} finally {
  await pool.end();
}
