#!/usr/bin/env node
/**
 * Renders every trait layer in traits.config.json as 100x100 pixel art
 * — the NATIVE resolution of the original solana-labs ecosystem logo —
 * plus the ten legendary 1/1 bulls.
 *
 * The base bull is THE ORIGINAL, extracted pixel-for-pixel at 1:1 scale
 * (extract-bull.mjs → bull-map.json). Body variants recolor it, horns
 * live in their own recolorable layer, and the original eyes become the
 * "Classic" eyes trait so variants can swap them.
 *
 * Accessory geometry is authored in the legacy 64-grid coordinate space
 * and mapped through scaled() (×100/64) so positions stay aligned with
 * the bull's anatomy.
 *
 * bull-map.json classes: F fur · S shade · D dark outline · M muzzle ·
 * m muzzle shade · . transparent
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, hex, rng, S } from "./pixel.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LAYERS = path.join(ROOT, "layers");
const K = S / 64; // legacy-coordinate scale factor

// map 64-space accessory coordinates onto the 100 grid
function scaled(g) {
  const f = (v) => Math.round(v * K);
  return {
    px: (x, y, c) => g.px(f(x), f(y), c),
    mpx: (x, y, c) => { g.px(f(x), f(y), c); g.px(S - 1 - f(x), f(y), c); },
    hspan: (x0, x1, y, c) => g.hspan(f(x0), f(x1), f(y), c),
    rect: (x0, y0, x1, y1, c) => g.rect(f(x0), f(y0), f(x1), f(y1), c),
    ring: (cx, cy, r0, r1, c) => g.ring(cx * K, cy * K, r0 * K, r1 * K, c),
    raw: g,
  };
}

// ------------------------------------------------------------ base map
const RAW = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/bull-map.json"), "utf8"),
).map((r) => r.split(""));

// fill '.' holes enclosed inside the bull (classifier misses)
{
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

// region predicates (100-space, measured on the extracted map)
const isHorn = (x, y) => y <= 47 && (x <= 33 || x >= 66);
const isEye = (x, y) =>
  y >= 56 && y <= 65 && ((x >= 34 && x <= 42) || (x >= 59 && x <= 67));

const BODY_MAP = RAW.map((row, y) =>
  row.map((c, x) => {
    if (c === ".") return ".";
    if (isHorn(x, y)) return ".";
    if (isEye(x, y) && c === "D") return "F";
    return c;
  }),
);
const HORN_MAP = RAW.map((row, y) =>
  row.map((c, x) => (c !== "." && isHorn(x, y) ? c : ".")),
);
const EYE_PIXELS = [];
RAW.forEach((row, y) =>
  row.forEach((c, x) => {
    if (c === "D" && isEye(x, y)) EYE_PIXELS.push([x, y]);
  }),
);

function paintMap(g, map, pal) {
  map.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c !== ".") g.px(x, y, hex(pal[c]));
    }),
  );
}

// ------------------------------------------------------------- bodies
const BODY_PALETTES = {
  "Classic White": { F: "#f2f2f7", S: "#c5c5c5", D: "#0a0a0e", M: "#e2c0c1", m: "#d6afb2" },
  Black:           { F: "#3a3a46", S: "#26262f", D: "#0a0a0e", M: "#5c5c6a", m: "#4a4a57" },
  Brown:           { F: "#9a6a3f", S: "#7a5230", D: "#241505", M: "#c99672", m: "#b07f5c" },
  Grey:            { F: "#a8aeb9", S: "#848a96", D: "#14161c", M: "#c6ccd6", m: "#b0b6c0" },
  "Zombie Green":  { F: "#8db877", S: "#6a9457", D: "#12200c", M: "#b2d49c", m: "#9cc186" },
  Golden:          { F: "#f5c542", S: "#cfa02c", D: "#3a2b05", M: "#f9e090", m: "#e6c866" },
  Robot:           { F: "#bcc3ce", S: "#8f97a5", D: "#12151c", M: "#79828f", m: "#646d7a" },
  Ice:             { F: "#c9ecf8", S: "#97d0e8", D: "#0c2430", M: "#e6f6fc", m: "#c6e4f4" },
  Lava:            { F: "#e5532e", S: "#b23a19", D: "#2c0a02", M: "#ffab55", m: "#f28332" },
  Ghost:           { F: "#e4eaf7", S: "#bcc7e0", D: "#3c4560", M: "#f0f3fb", m: "#d3dcee" },
};
export function drawBody(g, pal) {
  paintMap(g, BODY_MAP, pal);
  return g;
}

// -------------------------------------------------------------- horns
const HORN_PALETTES = {
  "Classic Tan": { F: "#e8dcc2", S: "#c9b892", D: "#0a0a0e" },
  Dark:          { F: "#5c4a3a", S: "#42352a", D: "#0a0a0e" },
  "Curved Red":  { F: "#d44534", S: "#a53023", D: "#2c0503" },
  Golden:        { F: "#f5c542", S: "#cfa02c", D: "#3a2b05" },
  "Ice Blue":    { F: "#bfe2f4", S: "#8cc4e0", D: "#0c2430" },
  Purple:        { F: "#c08cff", S: "#9a5fe0", D: "#1d0a38" },
};
export function drawHorns(g, pal, opts = {}) {
  paintMap(g, HORN_MAP, pal);
  const s = scaled(g);
  if (opts.flames) {
    const F = hex("#ff8c1a"), Y = hex("#ffd23e");
    for (const [x, y] of [[12, 12], [13, 10], [15, 13], [10, 15], [14, 16], [17, 11], [11, 19], [16, 8]]) {
      s.mpx(x, y, F); s.mpx(x, y - 0.6, F);
    }
    for (const [x, y] of [[13, 12], [14, 13], [12, 17], [15, 10]]) s.mpx(x, y, Y);
  }
  if (opts.rainbow) {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"].map((c) => hex(c));
    HORN_MAP.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === "F" || c === "S") g.px(x, y, cols[Math.floor(y / 5) % 6]);
      }),
    );
  }
  return g;
}

// --------------------------------------------------------------- eyes
function classicEyes(g, color = "#0a0a0e") {
  for (const [x, y] of EYE_PIXELS) g.px(x, y, hex(color));
}
export const EYES = {
  Classic: (g) => classicEyes(g),
  Green: (g) => { classicEyes(g, "#2f8f5b"); scaled(g).mpx(24, 38, hex("#9fe8c0")); },
  Blue: (g) => { classicEyes(g, "#3a6ecc"); scaled(g).mpx(24, 38, hex("#b8d2ff")); },
  Sunglasses: (g) => {
    const s = scaled(g);
    s.rect(20, 35.5, 45, 42, hex("#14141c"));
    s.rect(21, 37, 28, 41, hex("#2e2e3c"));
    s.rect(37, 37, 44, 41, hex("#2e2e3c"));
    s.hspan(17.5, 20, 36, hex("#14141c")); s.hspan(45, 47.5, 36, hex("#14141c"));
    s.rect(22, 38, 23, 38.6, hex("#585868")); s.rect(38, 38, 39, 38.6, hex("#585868"));
  },
  "Cyber Visor": (g) => {
    const s = scaled(g);
    s.rect(19, 35, 46, 42, hex("#0e2430"));
    s.rect(20, 36.5, 45, 40.5, hex("#3ec6ff"));
    s.rect(21, 37.5, 27, 38.2, hex("#bdf0ff"));
  },
  "Red Glow": (g) => {
    classicEyes(g, "#ff3b3b");
    const s = scaled(g);
    for (const [x, y] of [[22, 37], [27, 38], [23, 42], [26, 35]]) s.mpx(x, y, hex("#ff3b3b", 120));
  },
  Laser: (g) => {
    classicEyes(g, "#ff2020");
    const s = scaled(g);
    s.rect(0, 37.8, 21, 39.4, hex("#ff2020", 210));
    s.rect(44, 37.8, 63.9, 39.4, hex("#ff2020", 210));
    s.hspan(0, 21, 36.8, hex("#ff6a4d", 90)); s.hspan(44, 63.9, 36.8, hex("#ff6a4d", 90));
    s.hspan(0, 21, 40.4, hex("#ff6a4d", 90)); s.hspan(44, 63.9, 40.4, hex("#ff6a4d", 90));
  },
  "Dead X": (g) => {
    const D = hex("#0a0a0e");
    for (const cx of [38, 63]) {
      for (let i = 0; i < 8; i++) {
        g.rect(cx - 3 + i, 56 + i, cx - 2 + i, 57 + i, D);
        g.rect(cx + 2 - i, 56 + i, cx + 3 - i, 57 + i, D);
      }
    }
  },
  Hypno: (g) => {
    const P = hex("#b26eff");
    for (const cx of [38, 63]) {
      g.rect(cx - 3, 56, cx + 3, 65, P);
      g.rect(cx - 2, 59, cx + 2, 61, hex("#f4f4fb"));
      g.rect(cx - 1, 60, cx, 60, hex("#1d0a38"));
    }
  },
  Heart: (g) => {
    const R = hex("#ff4d6d");
    for (const cx of [38, 63]) {
      g.rect(cx - 3, 56, cx - 1, 57, R); g.rect(cx + 1, 56, cx + 3, 57, R);
      g.rect(cx - 4, 58, cx + 4, 61, R);
      g.rect(cx - 3, 62, cx + 3, 62, R);
      g.rect(cx - 2, 63, cx + 2, 63, R);
      g.rect(cx - 1, 64, cx + 1, 65, R);
      g.rect(cx - 2, 57, cx - 1, 58, hex("#ffb3c1"));
    }
  },
};

// -------------------------------------------------------------- mouths
export const MOUTHS = {
  Classic: () => {},
  Smile: (g) => {
    const s = scaled(g);
    s.rect(27, 57, 38, 57.6, hex("#0a0a0e"));
    s.rect(25.8, 56, 26.4, 56.6, hex("#0a0a0e")); s.rect(38.6, 56, 39.2, 56.6, hex("#0a0a0e"));
  },
  Ring: (g) => {
    const s = scaled(g);
    s.rect(31, 55, 34, 55.6, hex("#f5c542"));
    s.rect(29.8, 56, 30.4, 56.6, hex("#f5c542")); s.rect(34.8, 56, 35.4, 56.6, hex("#f5c542"));
    s.rect(31, 57.2, 34, 57.8, hex("#c99b2e"));
  },
  Cigar: (g) => {
    const s = scaled(g);
    s.rect(38, 53, 51, 55.4, hex("#6b4a2f"));
    s.rect(38, 55.8, 51, 56.4, hex("#523823"));
    s.rect(51.6, 53, 53.4, 56.4, hex("#ff6a1a"));
    s.rect(52.4, 54, 53.2, 54.8, hex("#ffd23e"));
    s.px(55, 49, hex("#9aa0ad", 150)); s.px(56, 46, hex("#9aa0ad", 110)); s.px(57, 43, hex("#9aa0ad", 70));
  },
  Pipe: (g) => {
    const s = scaled(g);
    s.rect(38, 56, 47, 57.4, hex("#6b4a2f"));
    s.rect(47, 52, 51, 57.4, hex("#523823"));
    s.rect(48, 53, 50, 54.4, hex("#3a2818"));
    s.px(49, 49, hex("#9aa0ad", 140)); s.px(50, 46, hex("#9aa0ad", 90));
  },
  Tongue: (g) => {
    const s = scaled(g);
    s.rect(29, 57, 36, 60.4, hex("#ff8fb0"));
    s.rect(31, 60.8, 34, 62.4, hex("#e56a90"));
    s.rect(32, 58, 33.4, 58.6, hex("#e56a90"));
  },
  "Gold Grill": (g) => {
    const s = scaled(g);
    s.rect(26, 56, 39, 57.4, hex("#f5c542"));
    s.rect(26, 57.8, 39, 58.4, hex("#c99b2e"));
    for (const x of [29, 33, 37]) s.rect(x, 56, x + 0.5, 56.6, hex("#fff1b8"));
  },
};

// ------------------------------------------------------------- clothes
const onBull = (x, y) => RAW[y]?.[x] !== "." && RAW[y]?.[x] !== undefined;
const inClothes = (x, y) =>
  onBull(x, y) && ((y >= 73 && (x <= 33 || x >= 66)) || y >= 95);

function baseClothes(g, main, shade) {
  const C = hex(main), Sh = hex(shade);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (inClothes(x, y)) g.px(x, y, (x + y) % 9 === 0 ? Sh : C);
  for (let x = 0; x < S; x++)
    for (let y = 72; y < S; y++)
      if (inClothes(x, y)) { g.px(x, y, Sh); g.px(x, y + 1, Sh); break; }
}
export const CLOTHES = {
  "Black Hoodie": (g) => { baseClothes(g, "#23232e", "#15151d"); hoodieStrings(g); },
  "Blue Hoodie": (g) => { baseClothes(g, "#3a6ecc", "#28509c"); hoodieStrings(g); },
  "Orange Hoodie": (g) => { baseClothes(g, "#e07b2e", "#b35a1a"); hoodieStrings(g); },
  Suit: (g) => {
    baseClothes(g, "#1d1f2c", "#12131d");
    const s = scaled(g);
    s.rect(27, 60, 38, 63.9, hex("#eef0f6"));
    s.rect(31, 60, 34, 63.9, hex("#c0392b"));
    s.rect(29.8, 60, 30.4, 60.8, hex("#8e2a20")); s.rect(34.8, 60, 35.4, 60.8, hex("#8e2a20"));
  },
  "Leather Jacket": (g) => {
    baseClothes(g, "#2f2a33", "#1e1a22");
    for (let y = 95; y < S; y++) g.px(y % 2 ? 50 : 51, y, hex("#8d95a3"));
    g.rect(3, 77, 19, 78, hex("#443d4a")); g.rect(80, 77, 96, 78, hex("#443d4a"));
  },
  "Fur Coat": (g) => {
    baseClothes(g, "#c9a06a", "#a37d4c");
    const r = rng(7);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++)
        if (inClothes(x, y) && r() < 0.28)
          g.px(x, y, hex(r() < 0.5 ? "#e0bd8b" : "#8a6a3e"));
  },
  "Red Robe": (g) => {
    baseClothes(g, "#a12734", "#711722");
    for (let i = 0; i < 13; i++) {
      g.rect(21 + i, 95 + Math.floor(i / 4), 21 + i, 96 + Math.floor(i / 4), hex("#f5c542"));
      g.rect(78 - i, 95 + Math.floor(i / 4), 78 - i, 96 + Math.floor(i / 4), hex("#f5c542"));
    }
  },
  "Golden Armor": (g) => {
    baseClothes(g, "#f5c542", "#c99b2e");
    for (let x = 0; x < S; x++) {
      if (inClothes(x, 82)) g.px(x, 82, hex("#c99b2e"));
      if (inClothes(x, 89)) g.px(x, 89, hex("#c99b2e"));
    }
    g.rect(6, 77, 16, 79, hex("#fff1b8")); g.rect(83, 77, 93, 79, hex("#fff1b8"));
  },
};
function hoodieStrings(g) {
  g.rect(27, 94, 28, 99, hex("#f4f4fb"));
  g.rect(75, 94, 76, 99, hex("#f4f4fb"));
}

// -------------------------------------------------------------- chains
function chainArc(g, c1, c2) {
  for (let x = 19; x <= 80; x++) {
    const t = (x - 49.5) / 30.5;
    const y = 91 + Math.round(4 * (1 - Math.abs(t)));
    g.px(x, y, x % 2 ? hex(c2) : hex(c1));
    g.px(x, y + 1, x % 2 ? hex(c1) : hex(c2));
  }
}
export const CHAINS = {
  "Gold Chain": (g) => chainArc(g, "#f5c542", "#c99b2e"),
  "Ice Chain": (g) => chainArc(g, "#dff4ff", "#8fd0f0"),
  "Cuban Link": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    for (let x = 22; x <= 77; x++) {
      const t = (x - 49.5) / 30.5;
      g.px(x, 93 + Math.round(4 * (1 - Math.abs(t))), hex("#c99b2e"));
    }
  },
  Amulet: (g) => {
    chainArc(g, "#c99b2e", "#a37d20");
    g.rect(47, 96, 52, 99, hex("#b26eff"));
    g.rect(47, 96, 48, 97, hex("#d9b8ff"));
  },
  "Purple Gem": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    g.rect(45, 96, 56, 99, hex("#8a4fd0"));
    g.rect(48, 96, 53, 98, hex("#b26eff"));
  },
  "Star Medallion": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    g.rect(49, 94, 52, 95, hex("#f5c542"));
    g.rect(46, 96, 55, 97, hex("#f5c542"));
    g.rect(48, 96, 53, 97, hex("#fff1b8"));
    g.rect(49, 98, 52, 99, hex("#f5c542"));
  },
  "Solana Pendant": (g) => {
    chainArc(g, "#2b2b36", "#1d1d26");
    g.rect(45, 95, 56, 96, hex("#14f195"));
    g.rect(45, 97, 56, 98, hex("#9945ff"));
    g.rect(45, 99, 56, 99, hex("#3ec6ff"));
  },
};

// ---------------------------------------------------------------- hats
export const HATS = {
  "Red Cap": (g) => {
    const s = scaled(g);
    s.rect(25, 16, 40, 22, hex("#d0342c"));
    s.rect(26, 15, 39, 15.6, hex("#d0342c"));
    s.hspan(26, 41, 23, hex("#8e2a20")); s.hspan(26, 41, 23.6, hex("#8e2a20"));
    s.rect(36, 22, 49, 24, hex("#d0342c"));
    s.hspan(36, 49, 25, hex("#8e2a20"));
    s.rect(31, 13, 34, 14.4, hex("#8e2a20"));
  },
  Cowboy: (g) => {
    const s = scaled(g);
    s.rect(26, 10, 39, 17, hex("#8a5a33"));
    s.rect(27, 9, 38, 9.6, hex("#8a5a33"));
    s.rect(26, 15, 39, 16, hex("#5e3c20"));
    s.rect(16, 18, 49, 21, hex("#8a5a33"));
    s.rect(16, 21, 49, 21.8, hex("#6e4526"));
    s.rect(15.4, 16.6, 16, 18, hex("#8a5a33")); s.rect(49, 16.6, 49.6, 18, hex("#8a5a33"));
  },
  "Top Hat": (g) => {
    const s = scaled(g);
    s.rect(26, 4, 39, 19, hex("#16161e"));
    s.rect(26, 15, 39, 17, hex("#c0392b"));
    s.rect(20, 20, 45, 22, hex("#16161e"));
    s.rect(27, 5, 28.4, 12, hex("#2e2e3c"));
  },
  "Pirate Hat": (g) => {
    const s = scaled(g);
    s.rect(22, 13, 43, 19, hex("#16161e"));
    s.rect(18, 16, 47, 21, hex("#16161e"));
    s.rect(16.8, 14.6, 17.6, 16, hex("#16161e")); s.rect(47.6, 14.6, 48.4, 16, hex("#16161e"));
    s.hspan(19, 46, 21.6, hex("#2e2e3c"));
    s.rect(31, 15, 34, 17.4, hex("#f4f4fb"));
    s.rect(31.6, 16, 32.2, 16.6, hex("#16161e")); s.rect(33.6, 16, 34.2, 16.6, hex("#16161e"));
    s.rect(29, 18, 29.8, 18.8, hex("#f4f4fb")); s.rect(35.6, 18, 36.4, 18.8, hex("#f4f4fb"));
  },
  "Viking Helm": (g) => {
    const s = scaled(g);
    s.rect(25, 14, 40, 22, hex("#b7bec9"));
    s.rect(26, 13, 39, 13.6, hex("#b7bec9"));
    s.hspan(25, 40, 22.4, hex("#8d95a3"));
    s.rect(31, 10, 34, 13, hex("#8d95a3"));
    s.rect(21, 10, 23, 16, hex("#eef0f6"));
    s.rect(40.6, 10, 42.6, 16, hex("#eef0f6"));
    s.rect(20.6, 8.6, 21.6, 10, hex("#eef0f6")); s.rect(42.2, 8.6, 43.2, 10, hex("#eef0f6"));
  },
  "Wizard Hat": (g) => {
    const s = scaled(g);
    const P = hex("#6b3fa0"), sh = hex("#4d2c78");
    for (let i = 0; i < 7; i++) {
      const hw = 1 + i;
      s.rect(32 - hw, 5 + i * 2, 31 + hw, 7 + i * 2, i % 2 ? sh : P);
    }
    s.rect(21, 19, 44, 21, sh);
    s.rect(29, 9, 29.7, 9.7, hex("#f5c542")); s.rect(35, 14, 35.7, 14.7, hex("#f5c542")); s.rect(27, 16, 27.7, 16.7, hex("#f5c542"));
  },
  "Samurai Helm": (g) => {
    const s = scaled(g);
    s.rect(24, 14, 41, 22, hex("#2b2b36"));
    s.hspan(24, 41, 22.4, hex("#1d1d26"));
    s.rect(31, 6, 34, 13, hex("#f5c542"));
    s.rect(28.6, 6.6, 29.6, 7.6, hex("#f5c542")); s.rect(35.4, 6.6, 36.4, 7.6, hex("#f5c542"));
    s.rect(20, 18, 23, 23, hex("#c0392b"));
    s.rect(42, 18, 45, 23, hex("#c0392b"));
  },
  Halo: (g) => {
    const s = scaled(g);
    s.rect(26, 6, 39, 6.7, hex("#f5c542"));
    s.rect(24, 7, 27, 7.7, hex("#f5c542")); s.rect(38, 7, 41, 7.7, hex("#f5c542"));
    s.rect(26, 8, 39, 8.7, hex("#f5c542"));
    s.rect(28, 7, 37, 7.6, hex("#fff1b8", 120));
  },
  Crown: (g) => {
    const s = scaled(g);
    s.rect(25, 15, 40, 21, hex("#f5c542"));
    for (const x of [25, 30, 35, 40]) s.rect(x, 12, x + 0.7, 15, hex("#f5c542"));
    s.hspan(25, 40, 21.4, hex("#c99b2e"));
    s.rect(28, 17, 28.7, 17.7, hex("#c0392b")); s.rect(32, 17, 32.7, 17.7, hex("#3a6ecc")); s.rect(37, 17, 37.7, 17.7, hex("#2f8f5b"));
  },
};

// ---------------------------------------------------------- backgrounds
function solid(c) {
  return (g) => g.rect(0, 0, S - 1, S - 1, hex(c));
}
export const BACKGROUNDS = {
  Blue: solid("#3b6fd4"),
  Purple: solid("#7b4fd0"),
  Green: solid("#2f8f5b"),
  Red: solid("#b33434"),
  Yellow: solid("#d9a832"),
  Galaxy: (g) => {
    g.rect(0, 0, S - 1, S - 1, hex("#171430"));
    const r = rng(99);
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(r() * S), y = Math.floor(r() * S);
      g.px(x, y, hex(r() < 0.7 ? "#f4f4fb" : "#ffd23e", r() < 0.5 ? 255 : 140));
    }
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(r() * (S - 5)), y = Math.floor(r() * (S - 5));
      g.rect(x, y, x + 3, y + 2, hex(r() < 0.5 ? "#6b3fa0" : "#3d2a6e", 130));
    }
  },
  Matrix: (g) => {
    g.rect(0, 0, S - 1, S - 1, hex("#071009"));
    const r = rng(1337);
    for (let x = 1; x < S; x += 5) {
      let y = Math.floor(r() * 60);
      const len = 12 + Math.floor(r() * 34);
      for (let i = 0; i < len; i++) {
        const yy = (y + i) % S;
        g.px(x, yy, hex(i === len - 1 ? "#8dffb0" : i > len - 5 ? "#39d367" : "#1f7a3d"));
        g.px(x + 1, yy, hex(i === len - 1 ? "#8dffb0" : "#134d26", 200));
      }
    }
  },
  Inferno: (g) => {
    for (let y = 0; y < S; y++)
      g.hspan(0, S - 1, y, hex(y < 30 ? "#33080a" : y < 55 ? "#661111" : y < 75 ? "#a12712" : "#d84f14"));
    const r = rng(66);
    for (let x = 0; x < S; x += 4) {
      const h = 68 - Math.floor(r() * 24);
      for (let y = h; y < 80; y++) {
        g.px(x + (y % 2), y, hex(y < h + 5 ? "#ff8c1a" : "#ffb84d"));
        g.px(x + 1 + (y % 2), y, hex(y < h + 5 ? "#ff8c1a" : "#ffb84d", 180));
      }
    }
  },
  "Ice City": (g) => {
    for (let y = 0; y < S; y++)
      g.hspan(0, S - 1, y, hex(y < 38 ? "#0e2440" : y < 68 ? "#1c4064" : "#2f6fa8"));
    const r = rng(12);
    let x = 0;
    while (x < S) {
      const w = 8 + Math.floor(r() * 9);
      const top = 38 + Math.floor(r() * 30);
      g.rect(x, top, Math.min(S - 1, x + w - 1), S - 1, hex("#77aed4"));
      for (let wy = top + 3; wy < S - 1; wy += 4)
        for (let wx = x + 2; wx < x + w - 2; wx += 3)
          if (r() < 0.5) g.rect(wx, wy, wx + 1, wy, hex("#dff4ff"));
      x += w + 3;
    }
  },
  "Neon Skyline": (g) => {
    for (let y = 0; y < S; y++)
      g.hspan(0, S - 1, y, hex(y < 25 ? "#0b0b12" : y < 44 ? "#241436" : y < 56 ? "#4d1d55" : "#1a0f24"));
    g.hspan(0, S - 1, 53, hex("#ff6ec7", 180));
    g.hspan(0, S - 1, 54, hex("#ff6ec7", 100));
    const r = rng(2077);
    let x = 0;
    while (x < S) {
      const w = 6 + Math.floor(r() * 10);
      const top = 50 + Math.floor(r() * 32);
      g.rect(x, top, Math.min(S - 1, x + w - 1), S - 1, hex("#14101c"));
      for (let wy = top + 2; wy < S - 1; wy += 3)
        for (let wx = x + 1; wx < x + w - 1; wx += 3)
          if (r() < 0.45) g.rect(wx, wy, wx + 1, wy, hex(r() < 0.5 ? "#ff6ec7" : "#3ec6ff"));
      x += w;
    }
  },
};

// ---------------------------------------------------------------- auras
function aura(colors) {
  return (g) => {
    colors.forEach((c, i) =>
      g.ring(49.5, 62, (27.4 - i * 1.6) * K, (29.2 - i * 1.6) * K, hex(c, 150 - i * 40)),
    );
  };
}
export const AURAS = {
  "Pink Glow": aura(["#ff6ec7", "#ff6ec7"]),
  "Cyan Glow": aura(["#3ec6ff", "#3ec6ff"]),
  "Golden Aura": aura(["#f5c542", "#ffd23e"]),
  "Rainbow Aura": (g) => {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - 49.5, y - 62);
        if (d >= 25.6 * K && d <= 29.2 * K) {
          const seg = Math.floor(((Math.atan2(y - 62, x - 49.5) + Math.PI) / (2 * Math.PI)) * 6);
          g.px(x, y, hex(cols[seg % 6], 170));
        }
      }
  },
  "Solana Aura": (g) => {
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - 49.5, y - 62);
        if (d >= 25.6 * K && d <= 29.2 * K)
          g.px(x, y, hex(y < 62 ? "#14f195" : "#9945ff", 160));
      }
  },
};

// -------------------------------------------------------- legendary 1/1s
function bull(opts) {
  const g = new Layer();
  if (opts.bg) BACKGROUNDS[opts.bg](g);
  if (opts.bgFn) opts.bgFn(g);
  if (opts.aura) AURAS[opts.aura](g);
  drawBody(g, BODY_PALETTES[opts.body]);
  if (opts.horns !== null)
    drawHorns(g, HORN_PALETTES[opts.horns ?? "Classic Tan"], opts.hornOpts ?? {});
  EYES[opts.eyes ?? "Classic"](g);
  MOUTHS[opts.mouth ?? "Classic"](g);
  if (opts.clothes) CLOTHES[opts.clothes](g);
  if (opts.chain) CHAINS[opts.chain](g);
  if (opts.hat) HATS[opts.hat](g);
  opts.extra?.(g);
  return g;
}

export const LEGENDARIES = {
  "Samurai Bull": () =>
    bull({ bg: "Inferno", body: "Grey", horns: "Dark", eyes: "Red Glow", clothes: "Red Robe", hat: "Samurai Helm" }),
  "Pharaoh Bull": () =>
    bull({
      bg: "Yellow", body: "Golden", horns: "Golden", clothes: "Golden Armor", chain: "Amulet",
      extra: (g) => {
        for (let y = 38; y <= 72; y++) {
          const c = hex(Math.floor(y / 3) % 2 ? "#f5c542" : "#2255aa");
          g.rect(12, y, 16, y, c); g.rect(83, y, 87, y, c);
        }
        g.rect(37, 19, 64, 24, hex("#f5c542"));
        g.rect(37, 21, 64, 22, hex("#2255aa"));
      },
    }),
  "Cyber Bull": () =>
    bull({ bg: "Matrix", body: "Robot", horns: "Ice Blue", eyes: "Cyber Visor", clothes: "Leather Jacket", chain: "Solana Pendant" }),
  "King Bull": () =>
    bull({ bg: "Purple", body: "Classic White", horns: "Golden", clothes: "Red Robe", chain: "Gold Chain", hat: "Crown", aura: "Golden Aura" }),
  "Demon Bull": () =>
    bull({ bg: "Inferno", body: "Black", horns: "Curved Red", hornOpts: { flames: true }, eyes: "Red Glow", mouth: "Smile" }),
  "Astronaut Bull": () =>
    bull({
      bg: "Galaxy", body: "Classic White", horns: null, clothes: "Fur Coat",
      extra: (g) => {
        g.ring(49.5, 53, 35, 38.4, hex("#dff4ff", 230));
        g.ring(49.5, 53, 31.8, 34.9, hex("#9ad2ee", 80));
        g.rect(22, 90, 77, 92, hex("#b7bec9"));
        g.rect(19, 94, 80, 96, hex("#8d95a3"));
      },
    }),
  "Wall Street Bull": () =>
    bull({ bg: "Ice City", body: "Brown", eyes: "Sunglasses", mouth: "Cigar", clothes: "Suit" }),
  "Pirate Bull": () =>
    bull({
      body: "Brown", horns: "Dark", mouth: "Gold Grill", clothes: "Leather Jacket", chain: "Gold Chain", hat: "Pirate Hat",
      bgFn: (g) => {
        g.rect(0, 0, S - 1, S - 1, hex("#123a5e"));
        const r = rng(4242);
        for (let x = 0; x < S; x += 7) {
          const y = 80 + Math.floor(r() * 10);
          g.rect(x, y, x + 2, y, hex("#3ec6ff"));
          g.rect(x + 3, y + 1, x + 4, y + 1, hex("#77aed4"));
        }
      },
      extra: (g) => {
        g.rect(57, 54, 70, 66, hex("#16161e")); // patch over right eye
        g.rect(30, 52, 56, 54, hex("#16161e")); // strap
        g.rect(71, 50, 73, 52, hex("#16161e"));
      },
    }),
  "Alien Bull": () =>
    bull({
      bg: "Galaxy", body: "Zombie Green", horns: "Purple", chain: "Amulet",
      extra: (g) => {
        const D = hex("#0a0a10");
        for (const cx of [38, 63]) {
          g.rect(cx - 5, 55, cx + 5, 66, D);
          g.rect(cx - 4, 53, cx + 4, 54, D);
          g.rect(cx - 4, 67, cx + 4, 67, D);
          g.rect(cx - 3, 56, cx - 1, 58, hex("#3ec6ff"));
        }
      },
    }),
  "God Bull": () =>
    bull({
      body: "Ghost", horns: "Golden", chain: "Star Medallion", hat: "Halo", aura: "Golden Aura",
      bgFn: (g) => {
        for (let y = 0; y < S; y++)
          g.hspan(0, S - 1, y, hex(y < 25 ? "#fdf6de" : y < 62 ? "#f7e8b8" : "#eed08a"));
        const r = rng(7777);
        for (let i = 0; i < 40; i++)
          g.px(Math.floor(r() * S), Math.floor(r() * 44), hex("#ffffff"));
      },
    }),
};

// ------------------------------------------------------------------ main
async function main() {
  const write = async (dir, name, g) => {
    fs.mkdirSync(path.join(LAYERS, dir), { recursive: true });
    await g.save(path.join(LAYERS, dir, `${name}.png`));
  };

  for (const [name, fn] of Object.entries(BACKGROUNDS)) {
    const g = new Layer(); fn(g); await write("Background", name, g);
  }
  for (const [name, fn] of Object.entries(AURAS)) {
    const g = new Layer(); fn(g); await write("Aura", name, g);
  }
  for (const [name, pal] of Object.entries(BODY_PALETTES)) {
    const g = new Layer(); drawBody(g, pal); await write("Body", name, g);
  }
  for (const [name, pal] of Object.entries(HORN_PALETTES)) {
    const g = new Layer(); drawHorns(g, pal); await write("Horns", name, g);
  }
  {
    const f = new Layer(); drawHorns(f, HORN_PALETTES["Classic Tan"], { flames: true });
    await write("Horns", "Flaming", f);
    const r = new Layer(); drawHorns(r, HORN_PALETTES["Classic Tan"], { rainbow: true });
    await write("Horns", "Rainbow", r);
  }
  for (const [name, fn] of Object.entries(EYES)) {
    const g = new Layer(); fn(g); await write("Eyes", name, g);
  }
  for (const [name, fn] of Object.entries(MOUTHS)) {
    const g = new Layer(); fn(g); await write("Mouth", name, g);
  }
  for (const [name, fn] of Object.entries(CLOTHES)) {
    const g = new Layer(); fn(g); await write("Clothes", name, g);
  }
  for (const [name, fn] of Object.entries(CHAINS)) {
    const g = new Layer(); fn(g); await write("Chain", name, g);
  }
  for (const [name, fn] of Object.entries(HATS)) {
    const g = new Layer(); fn(g); await write("Hat", name, g);
  }
  for (const [name, fn] of Object.entries(LEGENDARIES)) {
    await write("Legendaries", name, fn());
  }
  console.log(`layers written to ${LAYERS} (grid ${S}x${S})`);
}

main();
