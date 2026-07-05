import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "SolBulls Runner weekly leaderboard — the fastest runners the Bull couldn't catch.",
};

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-extrabold">
          Weekly <span className="gradient-text">Leaderboard</span> 🏆
        </h1>
        <p className="text-zinc-300 max-w-md text-sm">
          The runners the Bull couldn&apos;t catch. Every score here was
          validated by replaying the run on our servers — no shortcuts, no
          fakes. Top runners will share the weekly $SOLBULLS prize pool once
          rewards go live.
        </p>
      </header>
      <div className="w-full max-w-xl">
        <LeaderboardClient />
      </div>
      <Link
        href="/game"
        className="gradient-bg text-ink font-bold rounded-full px-6 py-3"
      >
        Run now 🐂
      </Link>
    </div>
  );
}
