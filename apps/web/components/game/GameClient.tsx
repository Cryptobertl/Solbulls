"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { GameCanvas } from "./GameCanvas";
import { LINKS } from "@/lib/config";

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
 */
export function GameClient() {
  const webgl = useSyncExternalStore(subscribeNoop, webglAvailable, () => true);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {webgl ? (
        <Game3D />
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            3D not supported on this device — running the classic mode.
          </p>
          <GameCanvas />
        </>
      )}
      <p className="text-xs text-zinc-500 max-w-md text-center">
        Scores are local for now. Wallet sign-in + the weekly $SOLBULLS prize
        pool are coming — follow{" "}
        <a href={LINKS.telegram} className="underline">
          Telegram
        </a>{" "}
        for launch.
      </p>
    </div>
  );
}
