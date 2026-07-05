import type { Metadata } from "next";
import { GameClient } from "@/components/game/GameClient";

export const metadata: Metadata = {
  title: "Runner",
  description:
    "SolBulls Runner — are you faster than the Bull? Grab $SOLBULLS coins and climb the leaderboard.",
};

export default function GamePage() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-extrabold">
          Are you faster than the <span className="gradient-text">Bull</span>? 🐂💨
        </h1>
        <p className="text-zinc-300 max-w-md text-sm">
          The SolBull is charging behind you. Pick your runner, collect
          $SOLBULLS coins and survive as long as you can. Compete on the
          weekly leaderboard — top runners share a prize pool bought from the
          token&apos;s creator fees.
        </p>
      </header>
      <GameClient />
    </div>
  );
}
