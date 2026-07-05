"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/token", label: "Token" },
  { href: "/mint", label: "Mint" },
  { href: "/collection", label: "Collection" },
  { href: "/game", label: "Runner" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/lore", label: "Lore" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-ink/80 border-b border-ink-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/solbulls.png" alt="SolBulls" width={32} height={32} className="rounded" />
          <span className="font-extrabold tracking-tight text-lg">
            Sol<span className="gradient-text">Bulls</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-zinc-300">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <WalletButton />
        </div>
        <button
          className="ml-auto md:hidden text-2xl"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
      {open && (
        <nav className="md:hidden border-t border-ink-line px-4 py-3 flex flex-col gap-3 text-zinc-200 bg-ink">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <WalletButton />
        </nav>
      )}
    </header>
  );
}
