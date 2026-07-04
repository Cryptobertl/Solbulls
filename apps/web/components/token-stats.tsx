"use client";

import { useEffect, useState } from "react";
import { TOKEN } from "@/lib/config";

type Stats = {
  priceUsd: string;
  marketCap: number | null;
  liquidityUsd: number | null;
  change24h: number | null;
};

function fmtUsd(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

/**
 * Live stats from the public DexScreener API, polled every 60s.
 * Fails soft: if the API is unreachable the strip shows dashes.
 */
export function TokenStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/solana/${TOKEN.pair}`,
        );
        const json = await res.json();
        const p = json?.pairs?.[0] ?? json?.pair;
        if (alive && p) {
          setStats({
            priceUsd: p.priceUsd ?? "—",
            marketCap: p.marketCap ?? p.fdv ?? null,
            liquidityUsd: p.liquidity?.usd ?? null,
            change24h: p.priceChange?.h24 ?? null,
          });
        }
      } catch {
        /* keep previous stats */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const cells: Array<[string, string]> = [
    ["Price", stats?.priceUsd ? `$${stats.priceUsd}` : "—"],
    ["Market cap", fmtUsd(stats?.marketCap ?? null)],
    ["Liquidity", fmtUsd(stats?.liquidityUsd ?? null)],
    [
      "24h",
      stats?.change24h != null
        ? `${stats.change24h > 0 ? "+" : ""}${stats.change24h}%`
        : "—",
    ],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cells.map(([label, value]) => (
        <div key={label} className="gradient-border px-4 py-3">
          <div className="text-xs text-zinc-400">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      ))}
    </div>
  );
}
