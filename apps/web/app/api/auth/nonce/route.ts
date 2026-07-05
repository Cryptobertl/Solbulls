import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDb, dbEnabled } from "@/lib/server/db";
import { authNonces } from "@/lib/server/schema";
import { siwsMessage } from "@/lib/server/siws";
import { lt } from "drizzle-orm";

export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ enabled: false }, { status: 503 });
  const { wallet } = await req.json().catch(() => ({}));
  if (typeof wallet !== "string" || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "bad wallet" }, { status: 400 });
  }
  const db = await getDb();
  const nonce = randomBytes(16).toString("base64url");
  await db.delete(authNonces).where(lt(authNonces.expiresAt, new Date()));
  await db.insert(authNonces).values({
    nonce,
    wallet,
    expiresAt: new Date(Date.now() + 5 * 60_000),
  });
  return NextResponse.json({ nonce, message: siwsMessage(wallet, nonce) });
}
