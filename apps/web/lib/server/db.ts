import "server-only";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Database access for the game backend.
 *
 * Production: Postgres via Neon serverless HTTP driver (DATABASE_URL).
 * Local dev:  PGlite (in-process WASM Postgres, stored in .pglite/) so the
 *             whole stack runs with zero setup — same SQL dialect.
 *
 * The schema is applied idempotently (CREATE TABLE IF NOT EXISTS) once per
 * process — cheap on serverless cold starts, and it means the only manual
 * step for production is setting DATABASE_URL + AUTH_SECRET.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

let dbPromise: Promise<AnyDb> | null = null;

const DDL = [
  `CREATE TABLE IF NOT EXISTS players (
    wallet text PRIMARY KEY,
    nickname text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS auth_nonces (
    nonce text PRIMARY KEY,
    wallet text NOT NULL,
    expires_at timestamptz NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id text PRIMARY KEY,
    wallet text NOT NULL,
    period text NOT NULL,
    seed bigint NOT NULL,
    token_hash text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'open',
    score integer,
    coins integer,
    ticks integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS runs_period_score ON runs (period, status, score DESC)`,
  `CREATE INDEX IF NOT EXISTS runs_wallet_created ON runs (wallet, created_at)`,
];

export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV !== "production";
}

export async function getDb(): Promise<AnyDb> {
  dbPromise ??= (async () => {
    let db: AnyDb;
    if (process.env.DATABASE_URL) {
      const client = neon(process.env.DATABASE_URL);
      db = drizzleNeon(client, { schema });
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error("DATABASE_URL is not set");
      }
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
      const client = new PGlite(".pglite");
      db = drizzlePglite(client, { schema });
    }
    for (const stmt of DDL) await db.execute(sql.raw(stmt));
    return db;
  })();
  return dbPromise;
}
