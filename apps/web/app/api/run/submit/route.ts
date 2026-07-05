import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { runs } from "@/lib/server/schema";
import { getSessionWallet, verifyRunToken, runTokenHash } from "@/lib/server/auth";
import { simulate, TICK_HZ, type InputEvent } from "@/lib/game/engine";

/**
 * Anti-cheat core: the client submits its INPUT LOG, not a score.
 * We replay the log through the same deterministic engine with the
 * server-issued seed — whatever the replay says is the score.
 */

const MAX_TICKS = 30 * 60 * TICK_HZ; // 30 minutes of play, way beyond survivable
const MAX_INPUTS = 20_000;

function validInputs(inputs: unknown, ticks: number): inputs is InputEvent[] {
  if (!Array.isArray(inputs) || inputs.length > MAX_INPUTS) return false;
  let prev = 0;
  for (const ev of inputs) {
    if (
      typeof ev !== "object" || ev === null ||
      typeof (ev as InputEvent).tick !== "number" ||
      !["left", "right", "jump", "roll"].includes((ev as InputEvent).action)
    ) {
      return false;
    }
    const t = (ev as InputEvent).tick;
    if (!Number.isInteger(t) || t < prev || t > ticks + 1) return false;
    prev = t;
  }
  return true;
}

export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { runId, token, inputs, ticks } = body ?? {};
  if (
    typeof runId !== "string" ||
    typeof token !== "string" ||
    !Number.isInteger(ticks) ||
    ticks < 0 ||
    ticks > MAX_TICKS ||
    !validInputs(inputs, ticks)
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.wallet, wallet)));
  const run = rows[0];
  if (!run || run.status !== "open") {
    return NextResponse.json({ error: "run not open" }, { status: 409 });
  }
  if (
    run.tokenHash !== runTokenHash(token) ||
    !verifyRunToken(token, runId, wallet, run.seed)
  ) {
    return NextResponse.json({ error: "bad run token" }, { status: 401 });
  }

  // Authoritative replay — client-claimed numbers are never trusted.
  const result = simulate(run.seed, inputs, ticks + 10);

  await db
    .update(runs)
    .set({
      status: "validated",
      score: result.score,
      coins: result.coins,
      ticks: result.tick,
      submittedAt: new Date(),
    })
    .where(and(eq(runs.id, runId), eq(runs.status, "open")));

  return NextResponse.json({ score: result.score, coins: result.coins });
}
