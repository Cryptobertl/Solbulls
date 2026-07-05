import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roadmap" };

const PHASES = [
  {
    name: "Phase 1 — The site",
    status: "live",
    items: ["New solbulls.xyz", "Live token stats", "Phantom wallet connect"],
  },
  {
    name: "Phase 2 — The art",
    status: "in progress",
    items: [
      "64×64 pixel trait layers (Bull Society master guide)",
      "10 legendary 1/1 bulls",
      "Community previews of generated bulls",
    ],
  },
  {
    name: "Phase 3 — Devnet mint",
    status: "next",
    items: [
      "Core Candy Machine + tokenBurn guard on devnet",
      "Full Phantom test: extension, iOS & Android in-app browser, deeplinks",
      "Final burn price fixed (~0.05 SOL worth, 7-day TWAP)",
    ],
  },
  {
    name: "Phase 4 — Mainnet launch",
    status: "upcoming",
    items: [
      "Holder allowlist mints the 100 rarest bulls",
      "Public phase: 999 in Series 1, max 10 per wallet, bot tax",
      "Live burned-supply counter",
    ],
  },
  {
    name: "Phase 5 — The herd grows",
    status: "future",
    items: [
      "Rarity explorer & holder roles",
      "Buy-and-burn from royalties",
      "Series 2: the herd grows toward the 2,222 max - at a higher burn price",
      "Heritage revival: staking, breeding & merging (2021 lore)",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-10 py-12">
      <h1 className="text-4xl font-extrabold">
        Road<span className="gradient-text">map</span>
      </h1>
      <ol className="flex flex-col gap-6 max-w-2xl">
        {PHASES.map((p) => (
          <li key={p.name} className="gradient-border p-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-bold text-lg">{p.name}</h2>
              <span className="text-xs font-mono uppercase tracking-wide gradient-text font-bold shrink-0">
                {p.status}
              </span>
            </div>
            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
