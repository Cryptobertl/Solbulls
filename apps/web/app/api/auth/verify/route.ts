import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { authNonces, players } from "@/lib/server/schema";
import { verifySiws } from "@/lib/server/siws";
import { createSession } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const { wallet, nonce, signature } = await req.json().catch(() => ({}));
  if (
    typeof wallet !== "string" ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const db = await getDb();
  const found = await db
    .select()
    .from(authNonces)
    .where(
      and(
        eq(authNonces.nonce, nonce),
        eq(authNonces.wallet, wallet),
        gt(authNonces.expiresAt, new Date()),
      ),
    );
  if (found.length === 0) {
    return NextResponse.json({ error: "nonce expired" }, { status: 401 });
  }
  await db.delete(authNonces).where(eq(authNonces.nonce, nonce)); // one-time
  if (!verifySiws(wallet, nonce, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  await db.insert(players).values({ wallet }).onConflictDoNothing();
  await createSession(wallet);
  const row = await db.select().from(players).where(eq(players.wallet, wallet));
  return NextResponse.json({ wallet, nickname: row[0]?.nickname ?? null });
}
