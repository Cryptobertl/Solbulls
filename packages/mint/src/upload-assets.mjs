#!/usr/bin/env node
/**
 * Uploads packages/nft/out/assets (images + metadata) to Arweave via
 * Irys and writes the resulting URI list to deploy.config.json.
 *
 * Devnet: Irys devnet node is used automatically (funded with devnet
 * SOL). Mainnet: real Irys — expect ~$20-80 for 888 images at 2048px.
 */
import fs from "node:fs";
import path from "node:path";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { createGenericFile } from "@metaplex-foundation/umi";
import { makeUmi, saveConfig, loadConfig, NFT_OUT } from "./env.mjs";

const ASSETS = path.join(NFT_OUT, "assets");
if (!fs.existsSync(ASSETS)) {
  console.error("No generated assets. Run `npm run generate` in packages/nft first.");
  process.exit(1);
}

const umi = makeUmi().use(
  irysUploader(
    process.env.CLUSTER === "mainnet-beta"
      ? {}
      : { address: "https://devnet.irys.xyz" },
  ),
);

const rarity = JSON.parse(
  fs.readFileSync(path.join(NFT_OUT, "rarity-report.json"), "utf8"),
);
const ids = rarity.bulls.map((b) => b.id).sort((a, z) => a - z);

const cfg = loadConfig();
const items = cfg.items ?? {};
let uploaded = 0;

for (const id of ids) {
  if (items[id]?.uri) continue; // resume support
  const img = fs.readFileSync(path.join(ASSETS, `${id}.png`));
  const [imageUri] = await umi.uploader.upload([
    createGenericFile(img, `${id}.png`, { contentType: "image/png" }),
  ]);
  const meta = JSON.parse(
    fs.readFileSync(path.join(ASSETS, `${id}.json`), "utf8"),
  );
  meta.image = imageUri;
  meta.properties.files[0].uri = imageUri;
  const uri = await umi.uploader.uploadJson(meta);
  items[id] = { name: meta.name, uri };
  uploaded++;
  if (uploaded % 25 === 0) {
    saveConfig({ items });
    console.log(`${uploaded} uploaded…`);
  }
}
saveConfig({ items });

// collection image + metadata → collectionUri (used by create-collection)
if (!cfg.collectionUri) {
  const img = fs.readFileSync(path.join(ASSETS, "collection.png"));
  const [imageUri] = await umi.uploader.upload([
    createGenericFile(img, "collection.png", { contentType: "image/png" }),
  ]);
  const meta = JSON.parse(
    fs.readFileSync(path.join(ASSETS, "collection.json"), "utf8"),
  );
  meta.image = imageUri;
  meta.properties.files[0].uri = imageUri;
  const collectionUri = await umi.uploader.uploadJson(meta);
  saveConfig({ collectionUri });
  console.log(`collectionUri: ${collectionUri}`);
}
console.log(`done: ${Object.keys(items).length}/${ids.length} items have URIs`);
