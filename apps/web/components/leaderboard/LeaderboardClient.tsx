"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  shortWallet,
  type Leaderboard,
} from "@/lib/game/api";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient() {
  const [board, setBoard] = useState<Leaderboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard().then((b) => {
      if (!cancelled) setBoard(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!board) {
    return <p className="text-zinc-400 animate-pulse py-12 text-center">Loading the herd…</p>;
  }

  if (!board.enabled) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-zinc-300">The global leaderboard is coming online soon. 🐂</p>
        <p className="text-zinc-500 text-sm">
          Until then your best score is saved on your device —{" "}
          <Link href="/game" className="underline">
            keep running
          </Link>
          .
        </p>
      </div>
    );
  }

  if (board.rows.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-zinc-300">
          No runs on the board yet this week — be the first! 🐂
        </p>
        <Link
          href="/game"
          className="gradient-bg text-ink font-bold rounded-full px-6 py-3 inline-block"
        >
          Outrun the Bull
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <p className="text-xs text-zinc-500 mb-3">
        Week {board.period} · best validated run per wallet · resets Monday 00:00 UTC
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-400 border-b border-ink-line">
            <th className="py-2 pr-3 font-normal">#</th>
            <th className="py-2 pr-3 font-normal">Runner</th>
            <th className="py-2 pr-3 font-normal text-right">Best score</th>
            <th className="py-2 font-normal text-right">Runs</th>
          </tr>
        </thead>
        <tbody>
          {board.rows.map((r) => {
            const you = board.viewer != null && r.wallet === board.viewer;
            return (
              <tr
                key={r.wallet}
                className={`border-b border-ink-line/50 ${you ? "bg-ink-soft" : ""}`}
              >
                <td className="py-2 pr-3">{MEDALS[r.rank - 1] ?? r.rank}</td>
                <td className="py-2 pr-3">
                  <span className={r.rank <= 3 ? "gradient-text font-bold" : ""}>
                    {r.nickname ?? shortWallet(r.wallet)}
                  </span>
                  {you && <span className="text-bull-mint text-xs ml-2">you</span>}
                </td>
                <td className="py-2 pr-3 text-right font-bold">{r.score}</td>
                <td className="py-2 text-right text-zinc-400">{r.runs}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
