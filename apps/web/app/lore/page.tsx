import type { Metadata } from "next";
import Image from "next/image";
import { LINKS } from "@/lib/config";

export const metadata: Metadata = { title: "Lore" };

export default function LorePage() {
  return (
    <div className="flex flex-col gap-8 py-12 max-w-2xl">
      <h1 className="text-4xl font-extrabold">
        The <span className="gradient-text">lore</span>
      </h1>
      <Image
        src="/solbulls.png"
        alt="The original SolBulls bull"
        width={120}
        height={120}
        className="rounded-2xl [image-rendering:pixelated]"
      />
      <div className="flex flex-col gap-4 text-zinc-300 leading-relaxed">
        <p>
          <strong className="text-white">October 2021.</strong> A gang of
          bulls stampeded onto Solana. <em>SolBulls Gang</em> entered the{" "}
          <a href={LINKS.ecosystemListing} className="underline">
            official Solana ecosystem directory
          </a>{" "}
          — bulls you could breed and merge to make more powerful, earning
          along the way. Staked bulls produced DNA. DNA made new bulls. The
          herd grew through the bear.
        </p>
        <p>
          <strong className="text-white">Now the bulls are back.</strong>{" "}
          $SOLBULLS runs on Solana as the herd&apos;s token, and the next
          generation of bulls — 2,222 of them, drawn pixel by pixel — can
          only be summoned one way: by fire. Burn tokens, mint a bull. Every
          new member of the herd makes the token scarcer.
        </p>
        <p>
          The original bull lives on in our logo and in the base head of
          every new SolBull. Same horns. Same attitude. New cycle. 🐂
        </p>
      </div>
      <div className="flex gap-5 text-sm">
        <a href={LINKS.community} className="underline">
          X Community
        </a>
        <a href={LINKS.discord} className="underline">
          Discord (heritage)
        </a>
      </div>
    </div>
  );
}
