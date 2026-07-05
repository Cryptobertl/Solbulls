import {
  pgTable,
  text,
  integer,
  bigint,
  timestamp,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  wallet: text("wallet").primaryKey(),
  nickname: text("nickname").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  wallet: text("wallet").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const runs = pgTable("runs", {
  id: text("id").primaryKey(),
  wallet: text("wallet").notNull(),
  period: text("period").notNull(),
  seed: bigint("seed", { mode: "number" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull().default("open"),
  score: integer("score"),
  coins: integer("coins"),
  ticks: integer("ticks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});
