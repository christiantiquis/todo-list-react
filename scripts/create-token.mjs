import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createApiToken, hashApiToken, normalizeApiTokenLabel } from "../src/lib/api-token.mjs";

const email = process.env.EMAIL?.trim().toLowerCase() ?? "";
const label = normalizeApiTokenLabel(process.env.LABEL ?? "") ?? "";
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Set EMAIL to the account address.");
  process.exit(1);
}
if (!label || label.length > 64) {
  console.error("Set LABEL to a name of 1–64 characters.");
  process.exit(1);
}

const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(schema);
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (!user.rows[0]) {
    console.error("That email does not have an account.");
    process.exit(1);
  }
  const token = createApiToken();
  await pool.query(
    "INSERT INTO api_tokens (user_id, token_hash, label) VALUES ($1, $2, $3)",
    [user.rows[0].id, hashApiToken(token), label],
  );
  console.log(`Created token for ${email} (${label})`);
  console.log(token);
} finally {
  await pool.end();
}
