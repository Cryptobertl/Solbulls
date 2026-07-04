/**
 * Canonical project configuration.
 *
 * SECURITY: token addresses here MUST match docs/TOKEN.md at the repo root.
 * Any change is security-sensitive — review against DexScreener + Solscan.
 */

export const TOKEN = {
  ticker: "$SOLBULLS",
  name: "SolBulls",
  /**
   * Token mint address (CA) — pinned in docs/TOKEN.md.
   * NEXT_PUBLIC_TOKEN_MINT overrides it ONLY for devnet testing with the
   * mock token (see docs/DEVNET_RUNBOOK.md).
   */
  mint:
    process.env.NEXT_PUBLIC_TOKEN_MINT ??
    "6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump",
  /** Raydium/DEX pair tracked on DexScreener */
  pair: "H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ",
  decimals: 6,
} as const;

export const LINKS = {
  dexscreener: `https://dexscreener.com/solana/${TOKEN.pair}`,
  solscan: `https://solscan.io/token/${TOKEN.mint}`,
  jupiter: `https://jup.ag/swap/SOL-${TOKEN.mint}`,
  /** Official X (Twitter) community */
  community: "https://x.com/i/communities/2027457477978272111",
  /** Heritage account from the 2021 SolBulls Gang era */
  twitter: "https://twitter.com/SolanaBullsNFT",
  discord: "https://discord.com/invite/Quf39wHSjg",
  github: "https://github.com/Cryptobertl/Solbulls",
  ecosystemListing:
    "https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md",
} as const;

export const MINT_CONFIG = {
  /** Total SolBull NFTs in the collection (decided 2026-07-04, matches the art master guide) */
  collectionSize: 888,
  /** The 100 rarest bulls are reserved for a $SOLBULLS-holder allowlist phase */
  allowlistReserve: 100,
  /**
   * $SOLBULLS burned per mint. Target value ≈ 0.1 SOL per mint (decided
   * 2026-07-04); the exact token amount is fixed from a 7-day TWAP right
   * before launch (see docs/PROJECT_PLAN.md §5.2) and must match the
   * deployed Candy Machine tokenBurn guard exactly.
   */
  burnAmount: process.env.NEXT_PUBLIC_BURN_AMOUNT
    ? Number(process.env.NEXT_PUBLIC_BURN_AMOUNT)
    : null,
  burnTargetSol: 0.1,
  perWalletLimit: 10,
  /**
   * Core Candy Machine addresses. Empty until the devnet/mainnet
   * deployment (Phase 3/4) — see docs/DEVNET_RUNBOOK.md. While empty,
   * the mint page runs in "preview" mode: wallet connect + balance
   * display work, the mint button is disabled.
   */
  candyMachine: process.env.NEXT_PUBLIC_CANDY_MACHINE ?? "",
  candyMachineOg: process.env.NEXT_PUBLIC_CANDY_MACHINE_OG ?? "",
  collection: process.env.NEXT_PUBLIC_COLLECTION ?? "",
  cluster: (process.env.NEXT_PUBLIC_CLUSTER ?? "devnet") as
    | "devnet"
    | "mainnet-beta",
} as const;

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (MINT_CONFIG.cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");

/** Phantom universal link that opens a URL inside Phantom's in-app browser */
export function phantomDeeplink(url: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(
    "https://solbulls.xyz",
  )}`;
}
