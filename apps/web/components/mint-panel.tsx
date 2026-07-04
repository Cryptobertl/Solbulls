"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MINT_CONFIG, TOKEN, LINKS } from "@/lib/config";
import { WalletButton } from "./wallet-button";

/**
 * Burn-to-mint panel.
 *
 * Live behaviour today: wallet connect (Phantom-first) + $SOLBULLS balance
 * display. The mint button activates once MINT_CONFIG.candyMachine is set
 * (Phase 3: Core Candy Machine with tokenBurn guard on devnet, then
 * mainnet). The transaction is always built client-side and signed in the
 * user's wallet — this site never holds keys or funds.
 */
export function MintPanel() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicKey) {
        if (!cancelled) setBalance(null);
        return;
      }
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(TOKEN.mint) },
        );
        const total = accounts.value.reduce(
          (sum, a) =>
            sum + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
          0,
        );
        if (!cancelled) setBalance(total);
      } catch {
        if (!cancelled) setBalance(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  const ready = Boolean(MINT_CONFIG.candyMachine && MINT_CONFIG.burnAmount);

  return (
    <div className="gradient-border p-6 sm:p-8 flex flex-col gap-6 max-w-xl">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-zinc-400">Collection</div>
          <div className="font-bold">{MINT_CONFIG.collectionSize} SolBulls</div>
        </div>
        <div>
          <div className="text-zinc-400">Burn per mint</div>
          <div className="font-bold">
            {MINT_CONFIG.burnAmount
              ? `${MINT_CONFIG.burnAmount.toLocaleString()} ${TOKEN.ticker}`
              : "set at launch (7-day TWAP)"}
          </div>
        </div>
        <div>
          <div className="text-zinc-400">Per wallet</div>
          <div className="font-bold">max {MINT_CONFIG.perWalletLimit}</div>
        </div>
        <div>
          <div className="text-zinc-400">Your {TOKEN.ticker}</div>
          <div className="font-bold">
            {connected ? (balance ?? "…").toLocaleString() : "connect wallet"}
          </div>
        </div>
      </div>

      {!connected ? (
        <WalletButton />
      ) : ready ? (
        <button className="gradient-bg text-ink font-bold rounded-full px-8 py-4 text-lg">
          Burn &amp; Mint 🔥🐂
        </button>
      ) : (
        <div className="rounded-xl bg-ink px-4 py-3 text-sm text-zinc-300">
          <p className="font-bold gradient-text mb-1">Mint not live yet</p>
          <p>
            Wallet connection works — the Candy Machine goes live on devnet
            in Phase 3, then mainnet. Follow{" "}
            <a href={LINKS.twitter} className="underline">
              @SolanaBullsNFT
            </a>{" "}
            for the date. Burning will happen in a single transaction you
            approve in Phantom: −{TOKEN.ticker}, +1 SolBull.
          </p>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Burns are irreversible. The exact burn amount and Candy Machine
        address will be published here and in the GitHub repo before launch —
        verify them before signing.
      </p>
    </div>
  );
}
