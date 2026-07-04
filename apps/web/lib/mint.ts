"use client";

/**
 * Burn-to-mint against the Core Candy Machine.
 *
 * The transaction is built client-side and signed by the connected
 * wallet (Phantom-first). It executes atomically:
 *   1. tokenBurn guard burns the configured $SOLBULLS amount
 *   2. one SolBull Core asset is minted to the signer
 * No backend, no custody — if either half fails, nothing happens.
 */
import type { WalletAdapter } from "@solana/wallet-adapter-base";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { generateSigner, some, publicKey } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  mintV1,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { MINT_CONFIG, RPC_ENDPOINT, TOKEN } from "./config";

export type MintResult = {
  asset: string;
  signature: string;
};

export async function burnAndMint(wallet: WalletAdapter): Promise<MintResult> {
  if (!MINT_CONFIG.candyMachine || !MINT_CONFIG.collection)
    throw new Error("Mint is not configured yet");
  if (!MINT_CONFIG.burnAmount) throw new Error("Burn amount not configured");

  const umi = createUmi(RPC_ENDPOINT)
    .use(mplCandyMachine())
    .use(walletAdapterIdentity(wallet));

  const asset = generateSigner(umi);
  const burnBaseUnits =
    BigInt(MINT_CONFIG.burnAmount) * 10n ** BigInt(TOKEN.decimals);

  const { signature } = await mintV1(umi, {
    candyMachine: publicKey(MINT_CONFIG.candyMachine),
    asset,
    collection: publicKey(MINT_CONFIG.collection),
    mintArgs: {
      tokenBurn: some({
        mint: publicKey(TOKEN.mint),
        amount: burnBaseUnits,
      }),
      mintLimit: some({ id: 1 }),
    },
  }).sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
  });

  return {
    asset: asset.publicKey.toString(),
    signature: base58.deserialize(signature)[0],
  };
}
