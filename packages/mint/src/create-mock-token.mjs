#!/usr/bin/env node
/**
 * DEVNET ONLY: creates a mock $SOLBULLS SPL token that mirrors the real
 * one (6 decimals, 1B supply) so the whole burn-to-mint flow can be
 * tested end-to-end before touching mainnet.
 *
 * On mainnet the REAL mint is used instead — pinned in docs/TOKEN.md:
 *   6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump
 */
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { createMintWithAssociatedToken } from "@metaplex-foundation/mpl-toolbox";
import { makeUmi, saveConfig } from "./env.mjs";

const DECIMALS = 6;
const SUPPLY = 1_000_000_000n * 10n ** BigInt(DECIMALS);

const umi = makeUmi();
if (process.env.CLUSTER === "mainnet-beta") {
  console.error("Refusing to create a mock token on mainnet.");
  process.exit(1);
}

const mint = generateSigner(umi);
await createMintWithAssociatedToken(umi, {
  mint,
  owner: umi.identity.publicKey,
  decimals: DECIMALS,
  amount: SUPPLY,
}).sendAndConfirm(umi);

saveConfig({ cluster: "devnet", tokenMint: mint.publicKey.toString() });
console.log(`mock $SOLBULLS mint: ${mint.publicKey}`);
console.log(`1,000,000,000 tokens minted to ${umi.identity.publicKey}`);
