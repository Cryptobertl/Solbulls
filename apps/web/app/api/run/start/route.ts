import { NextResponse } from "next/server";
import { randomUUID, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { runs } from "@/lib/server/schema";
import { getSessionWallet, signRunToken, runTokenHash } from "@/lib/server/auth";
import { currentPeriod } from "@/lib/server/period";

/**
 * Starts a ranked run: the SERVER picks the seed and hands the client an
 * HMAC token. The score later stored is whatever the engine replay of the
 * submitted input log produces — the client never gets to claim a score.
 */

const MAX_RUNS_PER_HOUR = 60;
const TOKEN_TTL_MS = 15 * 60_000; // generous: a great run lasts a few minutes

export async function POST() {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const db = await getDb();

  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const recent = await db
    .select({ n: sql<number>`count(*)` })
    .from(runs)
    .where(and(eq(runs.wallet, wallet), gt(runs.createdAt, hourAgo)));
  if (Number(recent[0]?.n ?? 0) >= MAX_RUNS_PER_HOUR) {
    return NextResponse.json(
      { error: "too many runs, take a breather 🐂" },
      { status: 429 },
    );
  }

  const runId = randomUUID();
  const seed = (randomBytes(4).readUInt32LE(0) >>> 0) || 1;
  const exp = Date.now() + TOKEN_TTL_MS;
  const token = signRunToken(runId, wallet, seed, exp);

  await db.insert(runs).values({
    id: runId,
    wallet,
    period: currentPeriod(),
    seed,
    tokenHash: runTokenHash(token),
  });

  return NextResponse.json({ runId, seed, token });
}
