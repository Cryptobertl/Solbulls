"use client";

import bs58 from "bs58";

/** Client helpers for the game backend (SIWS auth, ranked runs, leaderboard). */

export interface Session {
  /** false ⇒ backend not configured yet (no DB) — play stays local */
  enabled: boolean;
  wallet: string | null;
  nickname: string | null;
}

export interface RankedRun {
  runId: string;
  seed: number;
  token: string;
}

export interface LeaderboardRow {
  rank: number;
  wallet: string;
  nickname: string | null;
  score: number;
  runs: number;
}

export interface Leaderboard {
  enabled: boolean;
  period?: string;
  viewer?: string | null;
  rows: LeaderboardRow[];
}

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 503) {
    throw new Error(data.error ?? `request failed (${res.status})`);
  }
  return data;
}

export async function fetchMe(): Promise<Session> {
  try {
    const res = await fetch("/api/me");
    if (res.status === 503) return { enabled: false, wallet: null, nickname: null };
    const d = await json<{ wallet: string | null; nickname: string | null }>(res);
    return { enabled: true, wallet: d.wallet, nickname: d.nickname ?? null };
  } catch {
    return { enabled: false, wallet: null, nickname: null };
  }
}

/** Full SIWS round-trip: nonce → wallet signMessage → verify (sets cookie). */
export async function signIn(
  wallet: string,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
): Promise<Session> {
  const nonceRes = await json<{ nonce: string; message: string }>(
    await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    }),
  );
  const sig = await signMessage(new TextEncoder().encode(nonceRes.message));
  const d = await json<{ wallet: string; nickname: string | null }>(
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        nonce: nonceRes.nonce,
        signature: bs58.encode(sig),
      }),
    }),
  );
  return { enabled: true, wallet: d.wallet, nickname: d.nickname ?? null };
}

export async function saveNickname(nickname: string): Promise<void> {
  await json(
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    }),
  );
}

export async function startRankedRun(): Promise<RankedRun | null> {
  try {
    const res = await fetch("/api/run/start", { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as RankedRun;
  } catch {
    return null;
  }
}

export async function submitRankedRun(
  run: RankedRun,
  inputs: { tick: number; action: string }[],
  ticks: number,
): Promise<{ score: number; coins: number } | null> {
  try {
    const res = await fetch("/api/run/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.runId, token: run.token, inputs, ticks }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { score: number; coins: number };
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(): Promise<Leaderboard> {
  try {
    return await json<Leaderboard>(await fetch("/api/leaderboard"));
  } catch {
    return { enabled: false, rows: [] };
  }
}

export function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
