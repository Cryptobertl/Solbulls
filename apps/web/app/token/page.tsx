import type { Metadata } from "next";
import { CopyCA } from "@/components/copy-ca";
import { TokenStats } from "@/components/token-stats";
import { LINKS, TOKEN } from "@/lib/config";

export const metadata: Metadata = { title: "Token" };

export default function TokenPage() {
  return (
    <div className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold">
          <span className="gradient-text">{TOKEN.ticker}</span>
        </h1>
        <p className="text-zinc-300 max-w-2xl">
          The SolBulls token, live on Solana. Contract address (always verify
          against this site and the GitHub repo):
        </p>
        <CopyCA />
      </header>

      <TokenStats />

      <section className="gradient-border overflow-hidden">
        <iframe
          title="DexScreener chart"
          src={`https://dexscreener.com/solana/${TOKEN.pair}?embed=1&theme=dark&trades=0&info=0`}
          className="w-full h-[500px] border-0"
        />
      </section>

      <section className="grid sm:grid-cols-2 gap-6">
        <div className="gradient-border p-6 flex flex-col gap-3">
          <h2 className="font-bold text-lg">How to buy</h2>
          <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-2">
            <li>Install Phantom and fund it with SOL.</li>
            <li>
              Open{" "}
              <a href={LINKS.jupiter} className="underline">
                Jupiter
              </a>{" "}
              (the CA is pre-filled from this link).
            </li>
            <li>Swap SOL → {TOKEN.ticker}. Done — welcome to the herd.</li>
          </ol>
          <a
            href={LINKS.jupiter}
            className="gradient-bg text-ink font-bold rounded-full px-6 py-3 text-center mt-2"
          >
            Buy on Jupiter
          </a>
        </div>
        <div className="gradient-border p-6 flex flex-col gap-3">
          <h2 className="font-bold text-lg">Utility: burn to mint</h2>
          <p className="text-sm text-zinc-300">
            {TOKEN.ticker} is the only way to mint a SolBull NFT. Minting
            burns tokens permanently, shrinking supply with every bull that
            joins the herd. Explorer links:{" "}
            <a href={LINKS.solscan} className="underline">
              Solscan
            </a>
            {" · "}
            <a href={LINKS.dexscreener} className="underline">
              DexScreener
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
