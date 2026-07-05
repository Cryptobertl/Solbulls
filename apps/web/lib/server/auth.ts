import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHmac } from "node:crypto";

/**
 * Session + run-token crypto. AUTH_SECRET must be set in production
 * (any long random string); a fixed dev secret keeps local runs easy.
 */

const COOKIE = "sb_session";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production")
      throw new Error("AUTH_SECRET is not set");
    return new TextEncoder().encode("solbulls-dev-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(wallet: string): Promise<void> {
  const jwt = await new SignJWT({ wallet })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSessionWallet(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.wallet === "string" ? payload.wallet : null;
  } catch {
    return null;
  }
}

/** HMAC run token binding runId+wallet+seed+expiry; stored server-side as a hash */
export function signRunToken(runId: string, wallet: string, seed: number, exp: number): string {
  const mac = createHmac("sha256", Buffer.from(secret()))
    .update(`${runId}|${wallet}|${seed}|${exp}`)
    .digest("base64url");
  return `${exp}.${mac}`;
}

export function runTokenHash(token: string): string {
  return createHmac("sha256", Buffer.from(secret())).update(token).digest("base64url");
}

export function verifyRunToken(
  token: string,
  runId: string,
  wallet: string,
  seed: number,
): boolean {
  const [expStr] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return signRunToken(runId, wallet, seed, exp) === token;
}
