#!/usr/bin/env node
/**
 * Generates the SolBulls Runner game sprites into apps/web/public/game/.
 * The player bull is composed from the SAME layer PNGs as the NFTs (so the
 * runner is literally the logo bull); the bear, coin, and obstacles are
 * drawn fresh in the same 100x100 pixel grammar via the Layer toolkit.
 *
 * Run:  node src/make-game-sprites.mjs   (after draw-layers.mjs)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Layer, hex } from "./pixel.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LAYERS = path.join(ROOT, "layers");
const OUT = path.resolve(ROOT, "../../apps/web/public/game");
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 4; // export at 400x400 for crisp scaling in-canvas

async function saveLayer(layer, name) {
  await sharp(Buffer.from(layer.d), { raw: { width: 100, height: 100, channels: 4 } })
    .resize(100 * SCALE, 100 * SCALE, { kernel: "nearest" })
    .png()
    .toFile(path.join(OUT, `${name}.png`));
}

// ---- player bull: compose the real layers (front-facing hero) ----
async function bull() {
  const L = (c, n) => path.join(LAYERS, c, `${n}.png`);
  const base = L("Body", "Classic White");
  const flat = await sharp(base)
    .composite([
      { input: L("Horns", "Classic Tan") },
      { input: L("Eyes", "Classic") },
    ])
    .png()
    .toBuffer();
  await sharp(flat)
    .resize(100 * SCALE, 100 * SCALE, { kernel: "nearest" })
    .png()
    .toFile(path.join(OUT, "bull.png"));
}

// ---- bear chaser: brown menacing bear head ----
function bear() {
  const g = new Layer();
  const F = hex("#6b4a2f"), S = hex("#513722"), D = hex("#160d06");
  const M = hex("#3a2818"), R = hex("#ff3b3b");
  // ears
  g.rect(24, 20, 36, 32, F); g.rect(64, 20, 76, 32, F);
  g.rect(28, 24, 32, 28, M); g.rect(68, 24, 72, 28, M);
  // head
  for (let y = 26; y <= 78; y++) {
    const t = (y - 52) / 26;
    const hw = Math.round(30 * Math.sqrt(Math.max(0, 1 - t * t)) + 8);
    g.cspan(y, hw, F);
    g.px(50 - hw, y, S); g.px(49 + hw, y, S);
  }
  // brow shadow (angry)
  g.rect(30, 44, 46, 47, S); g.rect(54, 44, 70, 47, S);
  // eyes (angry red)
  g.rect(36, 48, 42, 53, D); g.rect(58, 48, 64, 53, D);
  g.rect(37, 49, 40, 51, R); g.rect(59, 49, 62, 51, R);
  // snout
  for (let y = 60; y <= 74; y++) g.cspan(y, 14 - Math.abs(y - 67) / 2, M);
  g.rect(42, 62, 58, 66, hex("#2a1c10"));
  // nose
  g.rect(45, 60, 55, 64, D);
  // mouth / fangs
  g.rect(40, 70, 60, 73, D);
  g.rect(43, 70, 45, 74, hex("#f4f4fb")); g.rect(55, 70, 57, 74, hex("#f4f4fb"));
  return g;
}

// ---- $SOLBULLS coin: gold coin with a bull silhouette ----
function coin() {
  const g = new Layer();
  const G = hex("#f5c542"), D = hex("#c99b2e"), Hi = hex("#fff1b8"), Dk = hex("#a37d20");
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 100; x++) {
      const d = Math.hypot(x - 50, y - 50);
      if (d <= 44) g.px(x, y, d > 40 ? Dk : G);
    }
  // inner ring
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 100; x++) {
      const d = Math.hypot(x - 50, y - 50);
      if (d >= 34 && d <= 37) g.px(x, y, D);
    }
  // shine
  g.rect(28, 20, 34, 30, Hi);
  // bull head glyph (horns + head)
  g.rect(34, 44, 66, 62, Dk);      // head
  g.rect(30, 38, 38, 48, Dk);      // left horn
  g.rect(62, 38, 70, 48, Dk);      // right horn
  g.rect(40, 62, 60, 68, Dk);      // muzzle
  g.rect(42, 50, 46, 54, G); g.rect(54, 50, 58, 54, G); // eyes cutout
  return g;
}

// ---- obstacles ----
function barrier() {
  const g = new Layer();
  const R = hex("#d0342c"), W = hex("#f4f4fb"), D = hex("#8e2a20");
  g.rect(18, 40, 82, 70, R);
  for (let x = 18; x < 82; x += 16) g.rect(x, 40, x + 7, 70, W);
  g.rect(18, 66, 82, 70, D);
  g.rect(24, 70, 30, 86, hex("#3a3a46")); g.rect(70, 70, 76, 86, hex("#3a3a46"));
  return g;
}
function rock() {
  const g = new Layer();
  const R = hex("#7c8290"), D = hex("#565c68"), Hi = hex("#a8aeb9");
  for (let y = 42; y <= 82; y++) {
    const t = (y - 62) / 20;
    const hw = Math.round(28 * Math.sqrt(Math.max(0, 1 - t * t * 0.7)));
    g.cspan(y, hw, R);
    g.px(49 + hw, y, D);
  }
  g.rect(38, 50, 52, 56, Hi); g.rect(56, 62, 66, 68, D);
  return g;
}

// ---- 2D runner (the player): small pixel man ----
function runner() {
  const g = new Layer();
  const SKIN = hex("#e8b48c"), SHIRT = hex("#ff6ec7"), PANTS = hex("#23232e");
  const HAIR = hex("#2b2118"), SHOE = hex("#f4f4fb"), D = hex("#14141c");
  // head
  g.rect(38, 14, 62, 36, SKIN);
  g.rect(38, 10, 62, 20, HAIR);
  g.rect(42, 24, 46, 28, D); g.rect(54, 24, 58, 28, D); // eyes
  // torso
  g.rect(36, 38, 64, 62, SHIRT);
  g.rect(48, 40, 52, 60, hex("#f4f4fb")); // zip
  // arms
  g.rect(28, 40, 34, 58, SHIRT); g.rect(66, 40, 72, 58, SHIRT);
  g.rect(28, 58, 34, 62, SKIN); g.rect(66, 58, 72, 62, SKIN);
  // legs
  g.rect(40, 64, 48, 84, PANTS); g.rect(52, 64, 60, 84, PANTS);
  g.rect(40, 84, 48, 90, SHOE); g.rect(52, 84, 60, 90, SHOE);
  return g;
}

async function main() {
  await bull();
  await saveLayer(runner(), "runner");
  await saveLayer(bear(), "bear");
  await saveLayer(coin(), "coin");
  await saveLayer(barrier(), "barrier");
  await saveLayer(rock(), "rock");
  console.log(`game sprites written to ${OUT}`);
}
main();
