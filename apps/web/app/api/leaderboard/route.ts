import { NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { runs, players } from "@/lib/server/schema";
import { getSessionWallet } from "@/lib/server/auth";
import { currentPeriod } from "@/lib/server/period";

export const dynamic = "force-dynamic";

/** Weekly leaderboard: best validated score per wallet this ISO week. */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ enabled: false, rows: [] });
  const db = await getDb();
  const period = currentPeriod();
  const viewer = await getSessionWallet();

  const best = sql<number>`max(${runs.score})`;
  const rows = await db
    .select({
      wallet: runs.wallet,
      nickname: players.nickname,
      score: best,
      runs: sql<number>`count(*)`,
    })
    .from(runs)
    .leftJoin(players, eq(players.wallet, runs.wallet))
    .where(and(eq(runs.period, period), eq(runs.status, "validated")))
    .groupBy(runs.wallet, players.nickname)
    .orderBy(desc(best))
    .limit(50);

  return NextResponse.json({
    enabled: true,
    period,
    viewer,
    rows: rows.map(
      (r: { wallet: string; nickname: string | null; score: number; runs: number }, i: number) => ({
        rank: i + 1,
        wallet: r.wallet,
        nickname: r.nickname,
        score: Number(r.score),
        runs: Number(r.runs),
      }),
    ),
  });
}
