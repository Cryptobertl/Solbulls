#!/usr/bin/env node
/**
 * Extracts the ORIGINAL SolBulls logo bull (assets/img/solbulls.png,
 * 100x100 anti-aliased) into a clean 64x64 paletted pixel map:
 *
 *   classes: F fur, S shade, D dark (outline/eyes), M muzzle pink,
 *            m muzzle shade, . background
 *
 * Output: src/bull-map.json (64 rows of class characters) — the ground
 * truth the layer renderer builds every body variant from.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.resolve(ROOT, "../../assets/img/solbulls.png");
const OUT = path.join(ROOT, "src/bull-map.json");

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, CH = info.channels;

function classify(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (r + g + b) / 3;
  // gradient background: strongly saturated magenta/green/cyan/blue
  if (sat > 0.45 && lum > 40) return ".";
  // pink muzzle/ears: reddish, moderate saturation
  if (r > 150 && r > b && b > g - 10 && sat > 0.1 && sat <= 0.45)
    return lum > 195 ? "M" : "m";
  if (lum < 70) return "D";
  if (lum > 225) return "F";
  if (lum > 140) return "S";
  return "D";
}

// full-res class map
const full = [];
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * CH;
    row.push(classify(data[i], data[i + 1], data[i + 2]));
  }
  full.push(row);
}

// bull bounding box
let x0 = W, x1 = 0, y0 = H, y1 = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (full[y][x] !== ".") {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
console.log(`bull bbox: x ${x0}-${x1}, y ${y0}-${y1} (${x1 - x0 + 1}x${y1 - y0 + 1})`);

// fit bbox into 64x64 (keep aspect, center horizontally, anchor bottom)
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
const S = 64;
const scale = Math.min(S / bw, S / bh);
const tw = Math.round(bw * scale), th = Math.round(bh * scale);
const ox = Math.floor((S - tw) / 2), oy = S - th;

const grid = Array.from({ length: S }, () => Array(S).fill("."));
for (let ty = 0; ty < th; ty++) {
  for (let tx = 0; tx < tw; tx++) {
    // majority vote over the source cell
    const sx0 = x0 + Math.floor((tx / tw) * bw), sx1 = x0 + Math.max(sx0 - x0, Math.ceil(((tx + 1) / tw) * bw) - 1);
    const sy0 = y0 + Math.floor((ty / th) * bh), sy1 = y0 + Math.max(sy0 - y0, Math.ceil(((ty + 1) / th) * bh) - 1);
    const votes = {};
    for (let sy = sy0; sy <= Math.min(sy1, y1); sy++)
      for (let sx = sx0; sx <= Math.min(sx1, x1); sx++)
        votes[full[sy][sx]] = (votes[full[sy][sx]] ?? 0) + 1;
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    grid[oy + ty][ox + tx] = best;
  }
}

fs.writeFileSync(OUT, JSON.stringify(grid.map((r) => r.join("")), null, 0));
console.log(`bull-map.json written (${S}x${S})`);

// preview PNG
const PAL = { F: [242, 242, 247, 255], S: [197, 197, 197, 255], D: [10, 10, 14, 255], M: [226, 192, 193, 255], m: [214, 175, 178, 255], ".": [0, 0, 0, 0] };
const buf = new Uint8Array(S * S * 4);
grid.forEach((row, y) => row.forEach((c, x) => {
  const p = PAL[c]; const i = (y * S + x) * 4;
  buf[i] = p[0]; buf[i + 1] = p[1]; buf[i + 2] = p[2]; buf[i + 3] = p[3];
}));
await sharp(Buffer.from(buf), { raw: { width: S, height: S, channels: 4 } })
  .resize(256, 256, { kernel: "nearest" }).png()
  .toFile(path.join(ROOT, "extracted-preview.png"));
console.log("extracted-preview.png written");
