"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { phantomDeeplink } from "@/lib/config";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (m) => m.WalletMultiButton,
    ),
  { ssr: false },
);

function isMobile(): boolean {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function hasInjectedProvider(): boolean {
  const w = window as unknown as { phantom?: { solana?: unknown } };
  return Boolean(w.phantom?.solana);
}

/**
 * Phantom-first connect button.
 *
 * - Desktop or inside Phantom's in-app browser: normal wallet-adapter
 *   connect (Phantom is auto-detected via Wallet Standard).
 * - Mobile external browser (no injected provider): show "Open in
 *   Phantom" which deeplinks into Phantom's in-app browser on this page.
 */
const subscribeNoop = () => () => {};

export function WalletButton() {
  // false during SSR; on the client, true only on mobile browsers without
  // an injected wallet provider (i.e. outside Phantom's in-app browser).
  const needsDeeplink = useSyncExternalStore(
    subscribeNoop,
    () => isMobile() && !hasInjectedProvider(),
    () => false,
  );

  if (needsDeeplink) {
    return (
      <a
        href={phantomDeeplink(window.location.href)}
        className="gradient-bg text-ink font-bold rounded-full px-6 py-3 inline-block"
      >
        Open in Phantom
      </a>
    );
  }

  return <WalletMultiButton />;
}
