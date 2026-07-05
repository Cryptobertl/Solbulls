import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, dbEnabled } from "@/lib/server/db";
import { players } from "@/lib/server/schema";
import { getSessionWallet } from "@/lib/server/auth";

const NICK_RE = /^[a-zA-Z0-9_]{3,16}$/;

export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { nickname } = await req.json().catch(() => ({}));
  if (typeof nickname !== "string" || !NICK_RE.test(nickname)) {
    return NextResponse.json(
      { error: "3-16 letters, numbers or _" },
      { status: 400 },
    );
  }
  const db = await getDb();
  try {
    await db.update(players).set({ nickname }).where(eq(players.wallet, wallet));
  } catch {
    return NextResponse.json({ error: "nickname taken" }, { status: 409 });
  }
  return NextResponse.json({ wallet, nickname });
}
