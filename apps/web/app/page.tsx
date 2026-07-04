import Image from "next/image";
import Link from "next/link";
import { CopyCA } from "@/components/copy-ca";
import { TokenStats } from "@/components/token-stats";
import { LINKS, MINT_CONFIG } from "@/lib/config";

export default function Home() {
  return (
    <div className="flex flex-col gap-20 py-16">
      <section className="flex flex-col items-center text-center gap-6">
        <Image
          src="/solbulls.png"
          alt="SolBulls bull"
          width={140}
          height={140}
          priority
          className="rounded-2xl [image-rendering:pixelated]"
        />
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          The gang of bulls
          <br />
          <span className="gradient-text">living on Solana</span>
        </h1>
        <p className="max-w-xl text-zinc-300 text-lg">
          $SOLBULLS is live on Solana. Burn tokens to mint one of{" "}
          {MINT_CONFIG.collectionSize.toLocaleString()} pixel SolBulls — every
          mint destroys supply forever. 🔥🐂
        </p>
        <CopyCA />
        <div className="flex flex-col sm:flex-row w-full sm:w-auto px-2 sm:px-0 justify-center gap-4">
          <a
            href={LINKS.jupiter}
            className="gradient-bg text-ink font-bold rounded-full px-8 py-4 sm:py-3 text-center"
          >
            Buy $SOLBULLS
          </a>
          <Link
            href="/mint"
            className="gradient-border px-8 py-4 sm:py-3 font-bold hover:opacity-90 text-center"
          >
            Mint a SolBull
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-zinc-200">Live stats</h2>
        <TokenStats />
      </section>

      <section className="grid sm:grid-cols-3 gap-6">
        {[
          {
            title: "Burn to mint",
            body: `The only way to get a SolBull: burn ~${MINT_CONFIG.burnTargetSol} SOL worth of $SOLBULLS. One transaction, signed in Phantom.`,
          },
          {
            title: "Deflation forever",
            body: "Every mint permanently removes tokens from circulation. Watch the burned counter climb — verifiable on-chain, not our word.",
          },
          {
            title: "Since 2021",
            body: "SolBulls Gang has been in the official Solana ecosystem directory since October 2021. The herd is back.",
          },
        ].map((c) => (
          <div key={c.title} className="gradient-border p-6">
            <h3 className="font-bold gradient-text text-lg mb-2">{c.title}</h3>
            <p className="text-sm text-zinc-300">{c.body}</p>
          </div>
        ))}
      </section>

      <section className="text-center flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold">Join the herd</h2>
        <div className="flex flex-wrap justify-center gap-5 text-zinc-300">
          <a href={LINKS.community} className="underline hover:text-white">
            X Community
          </a>
          <a href={LINKS.discord} className="underline hover:text-white">
            Discord
          </a>
          <a href={LINKS.dexscreener} className="underline hover:text-white">
            DexScreener
          </a>
        </div>
      </section>
    </div>
  );
}
