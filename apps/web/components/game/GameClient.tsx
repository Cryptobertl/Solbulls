"use client";

import { GameCanvas } from "./GameCanvas";
import { LINKS } from "@/lib/config";

/**
 * Client wrapper around the game. WS1: plays locally with a local high
 * score. WS2 will add SIWS sign-in + submitting the run (score + input log)
 * to /api/run/submit so it counts on the leaderboard.
 */
export function GameClient() {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <GameCanvas />
      <p className="text-xs text-zinc-500 max-w-md text-center">
        Scores are local for now. Wallet sign-in + the on-chain weekly prize
        pool are coming — follow{" "}
        <a href={LINKS.telegram} className="underline">
          Telegram
        </a>{" "}
        for launch.
      </p>
    </div>
  );
}
