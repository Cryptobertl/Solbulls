import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { players } from "@/lib/server/schema";
import { getSessionWallet } from "@/lib/server/auth";

export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ wallet: null });
  const db = await getDb();
  const row = await db.select().from(players).where(eq(players.wallet, wallet));
  return NextResponse.json({ wallet, nickname: row[0]?.nickname ?? null });
}
