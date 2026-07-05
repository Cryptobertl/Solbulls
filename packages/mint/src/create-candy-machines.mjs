#!/usr/bin/env node
/**
 * Creates TWO Core Candy Machines sharing the SolBulls collection:
 *
 *   OG  — the 100 rarest bulls (rarity-report.json allowlistPool),
 *         guarded by allowList (Merkle root of holder wallets) +
 *         tokenBurn + botTax. Holder pre-phase.
 *   PUB — the remaining 899 bulls, guarded by tokenBurn + mintLimit
 *         (10/wallet) + botTax + startDate. Public phase.
 *
 * Guard groups can't partition WHICH items a wallet receives, so two
 * machines is the clean way to reserve specific items for holders.
 *
 * Burn amount: set BURN_AMOUNT (whole tokens) — fix it from a 7-day
 * TWAP at ~0.05 SOL worth right before launch. Allowlist wallets: put
 * one address per line in allowlist.txt.
 */
import fs from "node:fs";
import path from "node:path";
import {
  generateSigner,
  some,
  sol,
  dateTime,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  create,
  addConfigLines,
  getMerkleRoot,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { makeUmi, saveConfig, loadConfig, NFT_OUT, ROOT } from "./env.mjs";

const umi = makeUmi();
const cfg = loadConfig();

for (const key of ["tokenMint", "collection", "items"]) {
  if (!cfg[key]) {
    console.error(`deploy.config.json is missing "${key}" — run the earlier steps first.`);
    process.exit(1);
  }
}

const DECIMALS = 6;
const BURN_AMOUNT = BigInt(process.env.BURN_AMOUNT ?? "0");
if (BURN_AMOUNT <= 0n) {
  console.error("Set BURN_AMOUNT (whole $SOLBULLS tokens burned per mint).");
  process.exit(1);
}
const burnBase = BURN_AMOUNT * 10n ** BigInt(DECIMALS);

const rarity = JSON.parse(
  fs.readFileSync(path.join(NFT_OUT, "rarity-report.json"), "utf8"),
);
const ogIds = new Set(rarity.allowlistPool);
const allIds = rarity.bulls.map((b) => b.id);
const pubIds = allIds.filter((id) => !ogIds.has(id));

const allowlistPath = path.join(ROOT, "allowlist.txt");
const allowlist = fs.existsSync(allowlistPath)
  ? fs.readFileSync(allowlistPath, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)
  : [];
if (!allowlist.length) {
  console.warn("allowlist.txt empty/missing — OG machine gets a placeholder root (update before launch).");
}

const tokenBurnGuard = some({ mint: publicKey(cfg.tokenMint), amount: burnBase });
const botTaxGuard = some({ lamports: sol(0.01), lastInstruction: true });

async function makeCandyMachine(label, ids, guards) {
  const candyMachine = generateSigner(umi);
  const tx = await create(umi, {
    candyMachine,
    collection: publicKey(cfg.collection),
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: ids.length,
    authority: umi.identity.publicKey,
    isMutable: true,
    configLineSettings: some({
      prefixName: "",
      nameLength: 32,
      prefixUri: "",
      uriLength: 200,
      isSequential: false, // random order — anti-snipe
    }),
    guards,
  });
  await tx.sendAndConfirm(umi);

  // load items in batches
  const BATCH = 8;
  for (let i = 0; i < ids.length; i += BATCH) {
    const lines = ids.slice(i, i + BATCH).map((id) => ({
      name: cfg.items[id].name.slice(0, 32),
      uri: cfg.items[id].uri,
    }));
    await addConfigLines(umi, {
      candyMachine: candyMachine.publicKey,
      index: i,
      configLines: lines,
    }).sendAndConfirm(umi);
    if ((i / BATCH) % 10 === 0) console.log(`${label}: ${i + lines.length}/${ids.length} loaded`);
  }
  console.log(`${label} candy machine: ${candyMachine.publicKey} (${ids.length} items)`);
  return candyMachine.publicKey.toString();
}

const og = await makeCandyMachine("OG", [...ogIds], {
  botTax: botTaxGuard,
  tokenBurn: tokenBurnGuard,
  allowList: some({
    merkleRoot: allowlist.length
      ? getMerkleRoot(allowlist)
      : getMerkleRoot([umi.identity.publicKey.toString()]),
  }),
});

const pub = await makeCandyMachine("PUB", pubIds, {
  botTax: botTaxGuard,
  tokenBurn: tokenBurnGuard,
  mintLimit: some({ id: 1, limit: 10 }),
  ...(process.env.START_DATE
    ? { startDate: some({ date: dateTime(process.env.START_DATE) }) }
    : {}),
});

saveConfig({
  candyMachineOg: og,
  candyMachinePub: pub,
  burnAmount: BURN_AMOUNT.toString(),
});
console.log("\nNext: set NEXT_PUBLIC_CANDY_MACHINE / _OG on the website env and run npm run test-mint");
