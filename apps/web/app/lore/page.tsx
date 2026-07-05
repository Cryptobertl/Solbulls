import type { Metadata } from "next";
import Image from "next/image";
import { LINKS } from "@/lib/config";

export const metadata: Metadata = { title: "Lore" };

const ARTIFACTS = [
  {
    href: "https://github.com/solana-labs/ecosystem/blob/9e525b60b623b99dab6e204947212515ab80f158/img/solbulls.png",
    title: "img/solbulls.png",
    desc: "The original bull — a 100×100 pixel artwork committed to Solana Labs' official ecosystem repository. Every SolBull is built on these exact pixels.",
  },
  {
    href: "https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md",
    title: "projects/solbulls.md",
    desc: "The project file: “a gang of bulls living on #Solana. Breed and merge them to make yours more powerful” — dateAdded: 2021-10-10, status: live, category: NFT.",
  },
];

export default function LorePage() {
  return (
    <div className="flex flex-col gap-10 py-12 max-w-2xl">
      <h1 className="text-4xl font-extrabold">
        The <span className="gradient-text">lore</span>
      </h1>
      <Image
        src="/solbulls.png"
        alt="The original SolBulls bull from Solana Labs' ecosystem repository"
        width={120}
        height={120}
        className="rounded-2xl [image-rendering:pixelated]"
      />

      <div className="flex flex-col gap-4 text-zinc-300 leading-relaxed">
        <p>
          <strong className="text-white">October 10, 2021.</strong> Two files
          were merged into{" "}
          <a
            href="https://github.com/solana-labs/ecosystem"
            className="underline"
          >
            solana-labs/ecosystem
          </a>{" "}
          — the GitHub repository, curated by Solana Labs, that fed the
          official ecosystem directory on solana.com. A pixel bull and a
          promise: <em>SolBulls Gang</em>, a gang of bulls living on Solana —
          NFTs you could breed and merge to make more powerful. Staked bulls
          produced DNA. DNA made new bulls.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-white">
          The artifacts <span className="text-zinc-400 text-sm font-normal">(still on Solana&apos;s GitHub today)</span>
        </h2>
        {ARTIFACTS.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="gradient-border p-4 flex flex-col gap-1 hover:opacity-90"
          >
            <span className="font-mono font-bold gradient-text">{a.title} ↗</span>
            <span className="text-sm text-zinc-300">{a.desc}</span>
          </a>
        ))}
        <p className="text-xs text-zinc-500">
          Both links are pinned to the exact commits, so the provenance is
          verifiable forever — nobody can rewrite this history.
        </p>
      </section>

      <div className="flex flex-col gap-4 text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-white">The timing</h2>
        <p>
          The bull didn&apos;t arrive quietly. October 2021 was the peak of
          Solana&apos;s first great NFT wave — and exactly one month later,
          Solana threw its first Breakpoint conference in Lisbon, where
          co-founder Anatoly Yakovenko explained why NFTs mattered to the
          chain at all:
        </p>
        <blockquote className="gradient-border p-5 text-sm">
          <p className="italic text-zinc-200">
            &ldquo;There&apos;s a very deep, social component to crypto …
            NFTs are it. … It&apos;s purely for the community — it&apos;s
            content creators. It&apos;s just people having fun, but still
            able to monetize and make a living.&rdquo;
          </p>
          <footer className="mt-2 text-xs text-zinc-400">
            — Anatoly Yakovenko, Solana co-founder, Breakpoint 2021 (
            <a
              href="https://decrypt.co/85683/nfts-deep-social-component-crypto-solana-anatoly-yakovenko"
              className="underline"
            >
              Decrypt
            </a>
            )
          </footer>
        </blockquote>
        <p>
          Why would Solana&apos;s own curated directory carry a bull? We can
          only read the signs: the ecosystem repo was Solana Labs&apos;
          hand-reviewed map of what was being built on the chain — every
          listing was merged by their team. And of all the animals in crypto,
          they shipped the oldest symbol markets have:{" "}
          <strong className="text-white">the bull — pure optimism, horns
          first</strong> — at the very moment Solana was betting its future
          on community-made NFTs. Make of that what you will. The commits
          speak for themselves.
        </p>

        <h2 className="text-xl font-bold text-white">The unfinished mission</h2>
        <p>
          Read the 2021 listing again: it describes an{" "}
          <strong className="text-white">NFT collection</strong>. That was
          always the plan — written down, years ago, in Solana&apos;s own
          repository. The original gang never finished the mission; the bear
          market swallowed the herd.
        </p>
        <p>
          <strong className="text-white">Now the community is making it
          happen.</strong> SolBulls is a <strong className="text-white">CTO
          — a full community takeover</strong>: no old team, just members of
          the herd carrying the mission forward. $SOLBULLS runs on Solana as
          the herd&apos;s token,
          and the next generation — 999 bulls in the first series, drawn on
          the original&apos;s exact 100×100 pixels — can only be summoned one
          way: by fire. Burn tokens, mint a bull. Every new member of the
          herd makes the token scarcer.
        </p>
        <p>
          The original bull lives on in our logo and in the base head of
          every new SolBull. Same horns. Same attitude. New cycle. Real
          Solana bulls change their PFP to a bull. 🐂
        </p>
      </div>

      <div className="flex flex-wrap gap-5 text-sm">
        <a href={LINKS.community} className="underline">
          Join the X Community
        </a>
        <a href={LINKS.telegram} className="underline">
          Telegram Announcements
        </a>
        <a href={LINKS.telegramChat} className="underline">
          Telegram Chat
        </a>
      </div>
    </div>
  );
}
