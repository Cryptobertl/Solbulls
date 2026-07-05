import type { Metadata } from "next";
import { MintPanel } from "@/components/mint-panel";
import { MINT_CONFIG } from "@/lib/config";

export const metadata: Metadata = { title: "Mint" };

export default function MintPage() {
  return (
    <div className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3 max-w-2xl">
        <h1 className="text-4xl font-extrabold">
          Burn <span className="gradient-text">$SOLBULLS</span>, mint a
          SolBull 🔥
        </h1>
        <p className="text-zinc-300">
          {MINT_CONFIG.collectionSize.toLocaleString()} pixel bulls in Series 1 (max {MINT_CONFIG.maxSupply.toLocaleString()} across all series, later at a higher price). The only
          way in: burn roughly {MINT_CONFIG.burnTargetSol} SOL worth of
          $SOLBULLS per mint. The {MINT_CONFIG.allowlistReserve} rarest bulls
          are reserved for the holder allowlist phase. Works in Phantom on
          desktop and mobile.
        </p>
      </header>

      <MintPanel />

      <section className="max-w-2xl text-sm text-zinc-400 flex flex-col gap-2">
        <h2 className="font-bold text-zinc-200 text-base">How it works</h2>
        <p>
          1. Connect Phantom (or open this page inside Phantom&apos;s browser
          on mobile). 2. Approve a single transaction: it burns the required
          $SOLBULLS and mints one SolBull straight to your wallet. 3. Your
          bull appears in Phantom&apos;s Collectibles tab — instant reveal, no
          waiting.
        </p>
        <p>
          Phase 1 (allowlist): $SOLBULLS holders mint from the pool containing
          the {MINT_CONFIG.allowlistReserve} rarest bulls. Phase 2 (public):
          everyone, max {MINT_CONFIG.perWalletLimit} per wallet, bot tax
          active.
        </p>
      </section>
    </div>
  );
}
