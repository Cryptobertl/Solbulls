#!/usr/bin/env node
/**
 * Builds tiny placeholder trait layers + a fixture config so the pipeline
 * can be exercised end-to-end before the real Bull Society art lands.
 * Fixture bulls are just colored shapes — NOT the launch art.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIX = path.join(ROOT, "fixtures");
const LAYERS = path.join(FIX, "layers");

const SIZE = 64;

function rect(color, x, y, w, h) {
  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/></svg>`;
  return sharp(Buffer.from(svg)).png();
}

const spec = {
  Background: {
    full: true,
    traits: { Blue: "#3ec6ff", Pink: "#ff6ec7", Mint: "#4dffb8" },
  },
  Body: {
    traits: { White: "#f4f4fb", Black: "#22222c", Gold: "#f5c542" },
  },
  Eyes: {
    traits: { Classic: "#111118", Red: "#ff3b3b" },
  },
  Hat: {
    traits: { Crown: "#ffd700", Cap: "#d0342c" },
  },
};

fs.rmSync(FIX, { recursive: true, force: true });

for (const [cat, def] of Object.entries(spec)) {
  const dir = path.join(LAYERS, cat);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, color] of Object.entries(def.traits)) {
    const img = def.full
      ? rect(color, 0, 0, SIZE, SIZE)
      : cat === "Body"
        ? rect(color, 12, 20, 40, 44)
        : cat === "Eyes"
          ? rect(color, 20, 28, 8, 4)
          : rect(color, 22, 4, 20, 10); // Hat
    await img.toFile(path.join(dir, `${name}.png`));
  }
}

// one fake legendary
fs.mkdirSync(path.join(LAYERS, "Legendaries"), { recursive: true });
await rect("#b26eff", 8, 8, 48, 48).toFile(
  path.join(LAYERS, "Legendaries", "Test Legend.png"),
);

const config = {
  collection: {
    name: "SolBulls Fixture",
    symbol: "BULL",
    description: "fixture run",
    supply: 24,
    size: SIZE,
    outputScale: 4,
    seed: 42,
    sellerFeeBasisPoints: 500,
    externalUrl: "https://solbulls.xyz",
    allowlistPoolSize: 5,
  },
  legendaries: [{ name: "Test Legend" }],
  categories: Object.entries(spec).map(([cat, def]) => ({
    name: cat,
    traits: Object.keys(def.traits).map((name, i) => ({
      name,
      weight: 100 - i * 30,
      rarityTier: i === 0 ? "Common" : "Rare",
    })),
  })),
  exclusions: [],
};
fs.writeFileSync(
  path.join(FIX, "traits.fixture.json"),
  JSON.stringify(config, null, 2),
);
console.log(`fixture layers + config written to ${FIX}`);
