import type { Metadata } from "next";
import { CopyCA } from "@/components/copy-ca";
import { LINKS, MINT_CONFIG, TOKEN } from "@/lib/config";

export const metadata: Metadata = { title: "FAQ" };

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "What is the official contract address?",
    a: (
      <span>
        Only trust the CA shown on this site and in our{" "}
        <a href={LINKS.github} className="underline">
          GitHub repo
        </a>
        . It is also in the footer of every page.
      </span>
    ),
  },
  {
    q: "How do I mint a SolBull?",
    a: `Connect Phantom on the Mint page and approve one transaction. It burns the required ${TOKEN.ticker} (worth ~${MINT_CONFIG.burnTargetSol} SOL at launch pricing) and mints one of ${MINT_CONFIG.collectionSize.toLocaleString()} bulls directly to your wallet. On mobile, open the site inside Phantom's built-in browser.`,
  },
  {
    q: "What happens to the burned tokens?",
    a: "They are destroyed permanently at the SPL token level — total supply shrinks with every mint, and anyone can verify it on-chain.",
  },
  {
    q: "What is the allowlist?",
    a: `${TOKEN.ticker} holders get a pre-mint phase for the pool containing the ${MINT_CONFIG.allowlistReserve} rarest bulls, including the legendary 1/1s. Snapshot criteria will be announced in the X community before launch.`,
  },
  {
    q: "How many can I mint?",
    a: `Max ${MINT_CONFIG.perWalletLimit} per wallet in the public phase, enforced on-chain by the Candy Machine guards (plus a bot tax for invalid mint attempts).`,
  },
  {
    q: "Which wallets are supported?",
    a: "Phantom is first-class on every surface: browser extension, Phantom's mobile in-app browser, and deeplinks from mobile Safari/Chrome. Solflare, Backpack and other standard wallets also work.",
  },
  {
    q: "Is this the original 2021 team?",
    a: (
      <span>
        No — SolBulls is a <strong>CTO (community takeover)</strong>. The
        original bull and its NFT mission were published in Solana Labs&apos;
        ecosystem repo in October 2021 (see the{" "}
        <a href="/lore" className="underline">
          lore
        </a>
        ); the community picked the mission back up and is finishing it. Real
        Solana bulls change their PFP to a bull. 🐂
      </span>
    ),
  },
  {
    q: "Is this financial advice?",
    a: `No. ${TOKEN.ticker} is a community meme token and SolBull NFTs are collectibles. Burns are irreversible. Never spend more than you can afford to lose.`,
  },
];

export default function FaqPage() {
  return (
    <div className="flex flex-col gap-8 py-12 max-w-2xl">
      <h1 className="text-4xl font-extrabold">
        FA<span className="gradient-text">Q</span>
      </h1>
      <CopyCA />
      <dl className="flex flex-col gap-6">
        {FAQS.map((f) => (
          <div key={f.q} className="gradient-border p-6">
            <dt className="font-bold mb-2">{f.q}</dt>
            <dd className="text-sm text-zinc-300">{f.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
