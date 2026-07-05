#!/usr/bin/env node
/**
 * Voxelizes the SolBull (from bull-map.json — the original logo pixels)
 * and the Bear (rasterized from the same drawing used for the 2D game
 * sprite) into chunky chibi runner models for the 3D game.
 *
 * Pipeline per character: 2D class grid → downsample ×2 (majority class,
 * tie priority D>M>m>S>F so outlines survive) → extrude with a rounded
 * depth profile → shell-extract (drop fully enclosed voxels) → add
 * procedural stubby legs + tail with rig attach points.
 *
 * Output: apps/web/public/game/voxels.json
 *   { meta:{voxel:0.045}, palettes:{bull:[classNames], bear:[hexes]},
 *     parts:{ name:{palette, vox:[x,y,z,ci,...] } }, rig:{...} }
 * Bull classes stay symbolic so the client can tint any BODY_PALETTES
 * variant; horn cells get HF/HS so horns keep their own palette.
 *
 * Run: npm run voxels   (fails if total voxels > 6000)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, hex } from "./pixel.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.resolve(ROOT, "../../apps/web/public/game/voxels.json");

// ---------------------------------------------------------- bull grid
const RAW = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/bull-map.json"), "utf8"),
).map((r) => r.split(""));

// fill enclosed holes (same as draw-layers)
{
  const S = 100;
  const seen = Array.from({ length: S }, () => Array(S).fill(false));
  const q = [];
  for (let i = 0; i < S; i++)
    for (const [x, y] of [[i, 0], [i, S - 1], [0, i], [S - 1, i]])
      if (RAW[y][x] === "." && !seen[y][x]) { seen[y][x] = true; q.push([x, y]); }
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < S && ny < S && RAW[ny][nx] === "." && !seen[ny][nx]) {
        seen[ny][nx] = true; q.push([nx, ny]);
      }
    }
  }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (RAW[y][x] === "." && !seen[y][x]) RAW[y][x] = "S";
}
const isHorn = (x, y) => y <= 47 && (x <= 33 || x >= 66);
// remap horn cells to their own classes so they tint separately
const BULL_GRID = RAW.map((row, y) =>
  row.map((c, x) => {
    if (c === ".") return ".";
    if (isHorn(x, y)) return c === "D" ? "D" : c === "S" ? "HS" : "HF";
    return c;
  }),
);

// ---------------------------------------------------------- bear grid
// rasterize the 2D sprite bear drawing into a class grid via its colors
function bearGrid() {
  const g = new Layer();
  const F = hex("#6b4a2f"), S = hex("#513722"), D = hex("#160d06");
  const M = hex("#3a2818"), R = hex("#ff3b3b");
  g.rect(24, 20, 36, 32, F); g.rect(64, 20, 76, 32, F);
  g.rect(28, 24, 32, 28, M); g.rect(68, 24, 72, 28, M);
  for (let y = 26; y <= 78; y++) {
    const t = (y - 52) / 26;
    const hw = Math.round(30 * Math.sqrt(Math.max(0, 1 - t * t)) + 8);
    g.cspan(y, hw, F);
    g.px(50 - hw, y, S); g.px(49 + hw, y, S);
  }
  g.rect(30, 44, 46, 47, S); g.rect(54, 44, 70, 47, S);
  g.rect(36, 48, 42, 53, D); g.rect(58, 48, 64, 53, D);
  g.rect(37, 49, 40, 51, R); g.rect(59, 49, 62, 51, R);
  for (let y = 60; y <= 74; y++) g.cspan(y, 14 - Math.abs(y - 67) / 2, M);
  g.rect(42, 62, 58, 66, hex("#2a1c10"));
  g.rect(45, 60, 55, 64, D);
  g.rect(40, 70, 60, 73, D);
  g.rect(43, 70, 45, 74, hex("#f4f4fb")); g.rect(55, 70, 57, 74, hex("#f4f4fb"));

  const CLASSMAP = {
    "107,74,47": "BF", "81,55,34": "BS", "22,13,6": "BD",
    "58,40,24": "BM", "42,28,16": "BM", "255,59,59": "BR", "244,244,251": "BW",
  };
  const grid = [];
  for (let y = 0; y < 100; y++) {
    const row = [];
    for (let x = 0; x < 100; x++) {
      const i = (y * 100 + x) * 4;
      if (g.d[i + 3] === 0) { row.push("."); continue; }
      row.push(CLASSMAP[`${g.d[i]},${g.d[i + 1]},${g.d[i + 2]}`] ?? "BF");
    }
    grid.push(row);
  }
  return grid;
}

// ------------------------------------------------------------ helpers
const PRIORITY = ["D", "BD", "M", "BM", "BR", "BW", "m", "S", "BS", "HS", "HF", "F", "BF"];
function downsample2(grid) {
  const H = grid.length, W = grid[0].length;
  const out = [];
  for (let y = 0; y < H; y += 2) {
    const row = [];
    for (let x = 0; x < W; x += 2) {
      const votes = {};
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const c = grid[y + dy]?.[x + dx];
        if (c && c !== ".") votes[c] = (votes[c] ?? 0) + 1;
      }
      const keys = Object.keys(votes);
      if (keys.length === 0 || Object.values(votes).reduce((a, b) => a + b) < 2) {
        row.push(".");
        continue;
      }
      keys.sort(
        (a, b) => votes[b] - votes[a] || PRIORITY.indexOf(a) - PRIORITY.indexOf(b),
      );
      row.push(keys[0]);
    }
    out.push(row);
  }
  return out;
}

/** extrude a 2D grid into voxels [x,y,z,class]; front face keeps classes */
function extrude(grid, { depth = 7, muzzleExtra = 2, fillClass }) {
  const H = grid.length, W = grid[0].length;
  // bounds
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (grid[y][x] !== ".") {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
  const cx = (x0 + x1) / 2;
  const halfW = (x1 - x0) / 2 || 1;
  const solid = new Set();
  const cls = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = grid[y][x];
      if (c === ".") continue;
      const nx = (x - cx) / halfW;
      let d = Math.max(3, Math.round(depth * Math.sqrt(Math.max(0, 1 - nx * nx))));
      if (c === "M" || c === "m" || c === "BM") d += muzzleExtra;
      const edge2d = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(
        ([dx, dy]) => (grid[y + dy]?.[x + dx] ?? ".") === ".",
      );
      for (let z = 0; z < d; z++) {
        const k = key(x, y, z);
        solid.add(k);
        // z = d-1 is the face (character looks toward +z, camera behind at -z)
        const c2 = z === d - 1 ? c : edge2d ? shadeOf(c, fillClass) : fillClass;
        cls.set(k, c2);
      }
    }
  }
  // shell extraction
  const vox = [];
  for (const k of solid) {
    const [x, y, z] = k.split(",").map(Number);
    const enclosed = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ].every(([dx, dy, dz]) => solid.has(key(x + dx, y + dy, z + dz)));
    if (!enclosed) vox.push([x, y, z, cls.get(k)]);
  }
  // normalize: center x, ground y (bottom = 0, up = +y), center z
  const zs = vox.map((v) => v[2]);
  const zMid = (Math.min(...zs) + Math.max(...zs)) / 2;
  return vox.map(([x, y, z, c]) => [
    Math.round((x - cx) * 2) / 2,
    y1 - y,
    Math.round((z - zMid) * 2) / 2,
    c,
  ]);
}
function shadeOf(c, fillClass) {
  if (c === "HF" || c === "HS") return "HS";
  if (fillClass === "BF") return "BS";
  return "S";
}

/** procedural box part */
function box(w, h, d, cls, shade) {
  const vox = [];
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++)
      for (let z = 0; z < d; z++) {
        const shell =
          x === 0 || y === 0 || z === 0 || x === w - 1 || y === h - 1 || z === d - 1;
        if (!shell) continue;
        const c = y === 0 ? shade : cls;
        vox.push([x - (w - 1) / 2, y, z - (d - 1) / 2, c]);
      }
  return vox;
}

// ------------------------------------------------------------- build
const BULL_CLASSES = ["F", "S", "D", "M", "m", "HF", "HS"];
const BEAR_HEX = {
  BF: "#6b4a2f", BS: "#513722", BD: "#160d06",
  BM: "#3a2818", BR: "#ff3b3b", BW: "#f4f4fb",
};
const BEAR_CLASSES = Object.keys(BEAR_HEX);

const bullBust = extrude(downsample2(BULL_GRID), { fillClass: "F" });
const bearBust = extrude(downsample2(bearGrid()), { fillClass: "BF" });

const bullLeg = box(3, 6, 3, "F", "D"); // D = hoof shade on bottom
const bearLeg = box(3, 5, 3, "BF", "BD");
const bullTail = [
  [0, 0, 0, "S"], [0, 1, 0, "S"], [0, 2, -1, "S"], [0, 3, -1, "S"], [0, 4, -2, "S"],
  [0, 0, 1, "F"], [0, 1, 1, "F"],
];

const parts = {
  bullBust: { palette: "bull", vox: bullBust },
  bullLeg: { palette: "bull", vox: bullLeg },
  bullTail: { palette: "bull", vox: bullTail },
  bearBust: { palette: "bear", vox: bearBust },
  bearLeg: { palette: "bear", vox: bearLeg },
};

const rig = {
  // chibi runner: bust sits on 4 stubby legs; positions in voxel units
  // relative to the character group origin (ground under center).
  bull: {
    bust: { at: [0, 5, 0] },
    legs: [
      { at: [-10, 0, 3] }, { at: [10, 0, 3] },
      { at: [-10, 0, -3] }, { at: [10, 0, -3] },
    ],
    tail: { at: [0, 14, -6] },
  },
  bear: {
    bust: { at: [0, 4, 0] },
    legs: [
      { at: [-9, 0, 3] }, { at: [9, 0, 3] },
      { at: [-9, 0, -3] }, { at: [9, 0, -3] },
    ],
  },
};

const total = Object.values(parts).reduce((n, p) => n + p.vox.length, 0);
for (const [name, p] of Object.entries(parts))
  console.log(`${name}: ${p.vox.length} voxels`);
console.log(`total: ${total}`);
if (total > 6000) {
  console.error("voxel budget exceeded (6000) — increase downsampling");
  process.exit(1);
}

// encode classes as indices; flatten
function encode(p) {
  const table = p.palette === "bull" ? BULL_CLASSES : BEAR_CLASSES;
  const flat = [];
  for (const [x, y, z, c] of p.vox) flat.push(x, y, z, table.indexOf(c));
  return { palette: p.palette, vox: flat };
}
const json = {
  meta: { voxel: 0.045, version: 1 },
  palettes: { bull: BULL_CLASSES, bearHex: BEAR_HEX, bear: BEAR_CLASSES },
  parts: Object.fromEntries(Object.entries(parts).map(([k, p]) => [k, encode(p)])),
  rig,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(json));
console.log(`written: ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
