"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { GameCanvas } from "./GameCanvas";
import { SignInPanel } from "./SignInPanel";
import {
  startRankedRun,
  submitRankedRun,
  type RankedRun,
  type Session,
} from "@/lib/game/api";
import type { InputEvent } from "@/lib/game/engine";

// Three.js game is client-only and code-split: only /game pays for it.
const Game3D = dynamic(() => import("./Game3D"), {
  ssr: false,
  loading: () => (
    <p className="text-zinc-300 animate-pulse py-24">Loading the herd…</p>
  ),
});

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
const subscribeNoop = () => () => {};

/**
 * Chooses the renderer: full 3D when WebGL is available, otherwise the
 * original 2D canvas game (same deterministic engine, same scores).
 * When signed in, runs use a server seed and the input log is replayed
 * server-side — that validated score is what ranks on the leaderboard.
 */
export function GameClient() {
  const webgl = useSyncExternalStore(subscribeNoop, webglAvailable, () => true);
  const [session, setSession] = useState<Session | null>(null);
  const runRef = useRef<RankedRun | null>(null);
  const [submitted, setSubmitted] = useState<number | null>(null);

  const ranked = Boolean(session?.enabled && session.wallet);

  const getRun = useCallback(async () => {
    setSubmitted(null);
    const run = await startRankedRun();
    runRef.current = run;
    return run ? { seed: run.seed } : null;
  }, []);

  const onRunEnd = useCallback(
    async (result: { score: number; coins: number; inputs: InputEvent[]; ticks: number }) => {
      const run = runRef.current;
      runRef.current = null;
      if (!run) return;
      const validated = await submitRankedRun(run, result.inputs, result.ticks);
      if (validated) setSubmitted(validated.score);
    },
    [],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <SignInPanel onSession={setSession} />

      {webgl ? (
        <Game3D getRun={ranked ? getRun : undefined} onRunEnd={onRunEnd} />
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            3D not supported on this device — running the classic mode.
          </p>
          <GameCanvas />
        </>
      )}

      {submitted !== null && (
        <p className="text-sm text-bull-mint">
          Score {submitted} saved —{" "}
          <Link href="/leaderboard" className="underline">
            see the leaderboard 🏆
          </Link>
        </p>
      )}

      <p className="text-xs text-zinc-500 max-w-md text-center">
        {ranked
          ? "Your runs count for this week's leaderboard. The weekly $SOLBULLS prize pool is coming next."
          : "Sign in with your wallet to compete on the weekly leaderboard. The $SOLBULLS prize pool is coming next."}
      </p>
    </div>
  );
}
