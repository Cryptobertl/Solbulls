#!/usr/bin/env node
/**
 * CLI test mint against the PUB candy machine: burns BURN_AMOUNT mock
 * $SOLBULLS from the wallet and mints one SolBull. Verifies the full
 * guard path before any browser/Phantom testing.
 */
import { generateSigner, some, publicKey } from "@metaplex-foundation/umi";
import { mintV1 } from "@metaplex-foundation/mpl-core-candy-machine";
import { makeUmi, loadConfig } from "./env.mjs";

const umi = makeUmi();
const cfg = loadConfig();

const asset = generateSigner(umi);
await mintV1(umi, {
  candyMachine: publicKey(cfg.candyMachinePub),
  asset,
  collection: publicKey(cfg.collection),
  mintArgs: {
    tokenBurn: some({
      mint: publicKey(cfg.tokenMint),
      amount: BigInt(cfg.burnAmount) * 10n ** 6n,
    }),
    mintLimit: some({ id: 1 }),
  },
}).sendAndConfirm(umi);

console.log(`minted SolBull asset: ${asset.publicKey}`);
console.log(`burned ${cfg.burnAmount} $SOLBULLS — check supply on the explorer`);
