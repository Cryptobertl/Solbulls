#!/usr/bin/env node
/**
 * Creates the SolBulls Core collection (the on-chain "album" every
 * SolBull belongs to), with 5% royalties enforced via plugin.
 */
import { generateSigner } from "@metaplex-foundation/umi";
import { createCollection, ruleSet } from "@metaplex-foundation/mpl-core";
import { makeUmi, saveConfig, loadConfig } from "./env.mjs";

const umi = makeUmi();
const cfg = loadConfig();

const collection = generateSigner(umi);
await createCollection(umi, {
  collection,
  name: "SolBulls",
  uri: cfg.collectionUri ?? "https://solbulls.xyz/collection.json",
  plugins: [
    {
      type: "Royalties",
      basisPoints: 500,
      creators: [{ address: umi.identity.publicKey, percentage: 100 }],
      ruleSet: ruleSet("None"),
    },
  ],
}).sendAndConfirm(umi);

saveConfig({ collection: collection.publicKey.toString() });
console.log(`collection: ${collection.publicKey}`);
