import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { emptyTodoData, nextTodoData, parseTodoData, type TodoData } from "./todo-store";

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  pool ??= new Pool({ connectionString });
  return pool;
}

export function ensureDatabase() {
  if (!ready) {
    const sql = readFileSync(join(process.cwd(), "scripts", "schema.sql"), "utf8");
    ready = getPool().query(sql).then(() => undefined);
  }
  return ready;
}

export type AccountUser = { id: string; email: string; passwordHash: string };

export async function findUserByEmail(email: string): Promise<AccountUser | null> {
  await ensureDatabase();
  const result = await getPool().query<{ id: string; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email],
  );
  const row = result.rows[0];
  return row ? { id: row.id, email: row.email, passwordHash: row.password_hash } : null;
}

export async function insertUser(email: string, passwordHash: string) {
  await ensureDatabase();
  const result = await getPool().query<{ id: string; email: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email",
    [email, passwordHash],
  );
  return result.rows[0] ?? null;
}

export type ApiTokenSummary = { id: string; label: string; createdAt: string };

function tokenSummary(row: { id: string; label: string; created_at: Date | string }): ApiTokenSummary {
  return { id: row.id, label: row.label, createdAt: new Date(row.created_at).toISOString() };
}

export async function listApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  await ensureDatabase();
  const result = await getPool().query<{ id: string; label: string; created_at: Date }>(
    "SELECT id, label, created_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
    [userId],
  );
  return result.rows.map(tokenSummary);
}

export async function insertApiToken(userId: string, tokenHash: string, label: string): Promise<ApiTokenSummary> {
  await ensureDatabase();
  const result = await getPool().query<{ id: string; label: string; created_at: Date }>(
    "INSERT INTO api_tokens (user_id, token_hash, label) VALUES ($1, $2, $3) RETURNING id, label, created_at",
    [userId, tokenHash, label],
  );
  return tokenSummary(result.rows[0]);
}

export async function deleteApiToken(userId: string, id: string): Promise<boolean> {
  await ensureDatabase();
  const result = await getPool().query(
    "DELETE FROM api_tokens WHERE user_id = $1 AND id = $2",
    [userId, id],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function findUserIdByTokenHash(tokenHash: string): Promise<string | null> {
  await ensureDatabase();
  const result = await getPool().query<{ user_id: string }>(
    "SELECT user_id FROM api_tokens WHERE token_hash = $1",
    [tokenHash],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function readDocument(userId: string): Promise<{ data: TodoData; revision: number }> {
  await ensureDatabase();
  const result = await getPool().query<{ revision: number; data: unknown }>(
    "SELECT revision, data FROM todo_documents WHERE user_id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row) return { data: emptyTodoData(), revision: 0 };
  return { data: parseTodoData(row.data), revision: Number(row.revision) };
}

export async function saveDocument(userId: string, data: TodoData, expectedRevision: number): Promise<{ data: TodoData; revision: number } | null> {
  await ensureDatabase();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ revision: number }>(
      "SELECT revision FROM todo_documents WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    const revision = current.rows[0] ? Number(current.rows[0].revision) : 0;
    if (revision !== expectedRevision) {
      await client.query("ROLLBACK");
      return null;
    }
    const nextRevision = revision + 1;
    if (current.rows[0]) {
      await client.query(
        "UPDATE todo_documents SET data = $2::jsonb, revision = $3, updated_at = now() WHERE user_id = $1",
        [userId, JSON.stringify(data), nextRevision],
      );
    } else {
      await client.query(
        "INSERT INTO todo_documents (user_id, revision, data) VALUES ($1, $2, $3::jsonb)",
        [userId, nextRevision, JSON.stringify(data)],
      );
    }
    await client.query("COMMIT");
    return { data, revision: nextRevision };
  } catch (error) {
    await client.query("ROLLBACK");
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return null;
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDocument(userId: string, change: (data: TodoData) => TodoData) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readDocument(userId);
    const data = nextTodoData(current.data, change);
    const saved = await saveDocument(userId, data, current.revision);
    if (saved) return saved;
  }
  return null;
}
