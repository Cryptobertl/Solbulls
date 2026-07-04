import type { Metadata } from "next";
import Image from "next/image";
import { MINT_CONFIG } from "@/lib/config";

export const metadata: Metadata = { title: "Collection" };

const LEGENDARIES = [
  "Samurai Bull",
  "Pharaoh Bull",
  "Cyber Bull",
  "King Bull",
  "Demon Bull",
  "Astronaut Bull",
  "Wall Street Bull",
  "Pirate Bull",
  "Alien Bull",
  "God Bull",
];

const TRAITS: Array<[string, string]> = [
  ["Bodies", "15+"],
  ["Horns", "20+"],
  ["Eyes", "35+"],
  ["Mouths", "20+"],
  ["Hats", "35+"],
  ["Clothes", "30+"],
  ["Chains", "15+"],
  ["Backgrounds", "30+"],
];

export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-12 py-12">
      <header className="flex flex-col gap-3 max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          The <span className="gradient-text">SolBull</span> collection
        </h1>
        <p className="text-zinc-300">
          {MINT_CONFIG.collectionSize.toLocaleString()} bulls. 64×64 pixel
          art, layer-based, hand-designed traits — thousands of unique
          combinations, plus {LEGENDARIES.length} hand-crafted legendary 1/1s.
          The live gallery with rarity explorer appears here once minting
          starts.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-8 items-start">
        <div className="gradient-border p-4">
          <Image
            src="/bull-society-master-guide.jpeg"
            alt="SolBull pixel art master guide: layers, trait categories, stacking order and legendary 1/1 bulls"
            width={1200}
            height={1210}
            className="rounded-lg w-full h-auto"
          />
        </div>
        <div className="flex flex-col gap-6">
          <div className="gradient-border p-6">
            <h2 className="font-bold text-lg mb-3">Trait categories</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TRAITS.map(([name, count]) => (
                <div key={name} className="flex justify-between border-b border-ink-line pb-1">
                  <span className="text-zinc-300">{name}</span>
                  <span className="font-mono gradient-text font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="gradient-border p-6">
            <h2 className="font-bold text-lg mb-3">
              Legendary 1/1s <span className="text-zinc-400 text-sm">(hand-crafted)</span>
            </h2>
            <ul className="grid grid-cols-2 gap-1 text-sm text-zinc-300">
              {LEGENDARIES.map((l) => (
                <li key={l}>👑 {l}</li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500 mt-3">
              The {MINT_CONFIG.allowlistReserve} rarest bulls — including the
              legendaries — sit in the holder-allowlist pool.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
