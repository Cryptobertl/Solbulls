#!/usr/bin/env node
/**
 * Renders every trait layer in traits.config.json as 64x64 pixel art,
 * plus the ten legendary 1/1 bulls.
 *
 * The base bull is THE ORIGINAL: extracted pixel-for-pixel from the
 * solana-labs ecosystem logo (see extract-bull.mjs → bull-map.json) at
 * the same pixel density. Body variants recolor it, horns live in
 * their own recolorable layer, and the original eyes are lifted into
 * the "Classic" eyes trait so variants can swap them.
 *
 * bull-map.json classes: F fur · S shade · D dark outline · M muzzle ·
 * m muzzle shade · . transparent
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, hex, rng } from "./pixel.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LAYERS = path.join(ROOT, "layers");

// ------------------------------------------------------------ base map
const RAW = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/bull-map.json"), "utf8"),
).map((r) => r.split(""));

// fill '.' holes that are enclosed inside the bull (classifier misses)
{
  const seen = Array.from({ length: 64 }, () => Array(64).fill(false));
  const q = [];
  for (let i = 0; i < 64; i++)
    for (const [x, y] of [[i, 0], [i, 63], [0, i], [63, i]])
      if (RAW[y][x] === "." && !seen[y][x]) { seen[y][x] = true; q.push([x, y]); }
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < 64 && ny < 64 && RAW[ny][nx] === "." && !seen[ny][nx]) {
        seen[ny][nx] = true; q.push([nx, ny]);
      }
    }
  }
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      if (RAW[y][x] === "." && !seen[y][x]) RAW[y][x] = "S";
}

// region predicates on the extracted map
const isHorn = (x, y) => y <= 30 && (x <= 23 || x >= 42);
const isEye = (x, y) =>
  y >= 36 && y <= 41 && ((x >= 22 && x <= 27) || (x >= 38 && x <= 43));

// split the map: BODY (no horns, eyes flattened to fur), HORNS, EYES
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
// palette: F fur, S shade, D outline, M muzzle, m muzzle shade
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
// original horns are ivory: F highlights, S shading, D outline
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
  if (opts.flames) {
    const F = hex("#ff8c1a"), Y = hex("#ffd23e");
    for (const [x, y] of [[12, 12], [13, 10], [15, 13], [10, 15], [14, 16], [17, 11], [11, 19], [16, 8]]) {
      g.mpx(x, y, F);
    }
    for (const [x, y] of [[13, 12], [14, 13], [12, 17], [15, 10]]) g.mpx(x, y, Y);
  }
  if (opts.rainbow) {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"].map((c) => hex(c));
    HORN_MAP.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === "F" || c === "S") g.px(x, y, cols[Math.floor(y / 3) % 6]);
      }),
    );
  }
  return g;
}

// --------------------------------------------------------------- eyes
// original angry eyes as the Classic trait; variants replace them
function classicEyes(g, color = "#0a0a0e") {
  for (const [x, y] of EYE_PIXELS) g.px(x, y, hex(color));
}
export const EYES = {
  Classic: (g) => classicEyes(g),
  Green: (g) => { classicEyes(g, "#2f8f5b"); g.mpx(24, 39, hex("#9fe8c0")); },
  Blue: (g) => { classicEyes(g, "#3a6ecc"); g.mpx(24, 39, hex("#b8d2ff")); },
  Sunglasses: (g) => {
    g.rect(20, 36, 45, 42, hex("#14141c"));
    g.rect(21, 37, 28, 41, hex("#2e2e3c"));
    g.rect(37, 37, 44, 41, hex("#2e2e3c"));
    g.hspan(18, 20, 36, hex("#14141c")); g.hspan(45, 47, 36, hex("#14141c"));
    g.px(22, 38, hex("#585868")); g.px(38, 38, hex("#585868"));
  },
  "Cyber Visor": (g) => {
    g.rect(19, 35, 46, 42, hex("#0e2430"));
    g.rect(20, 37, 45, 40, hex("#3ec6ff"));
    g.rect(21, 38, 27, 38, hex("#bdf0ff"));
  },
  "Red Glow": (g) => {
    classicEyes(g, "#ff3b3b");
    for (const [x, y] of [[22, 37], [27, 38], [23, 42], [26, 35]]) g.mpx(x, y, hex("#ff3b3b", 120));
  },
  Laser: (g) => {
    classicEyes(g, "#ff2020");
    g.rect(0, 38, 21, 39, hex("#ff2020", 210));
    g.rect(44, 38, 63, 39, hex("#ff2020", 210));
    g.hspan(0, 21, 37, hex("#ff6a4d", 90)); g.hspan(44, 63, 37, hex("#ff6a4d", 90));
    g.hspan(0, 21, 40, hex("#ff6a4d", 90)); g.hspan(44, 63, 40, hex("#ff6a4d", 90));
  },
  "Dead X": (g) => {
    const D = hex("#0a0a0e");
    for (const cx of [24, 40]) {
      for (let i = 0; i < 5; i++) {
        g.px(cx - 2 + i, 36 + i, D);
        g.px(cx + 2 - i, 36 + i, D);
      }
    }
  },
  Hypno: (g) => {
    const P = hex("#b26eff");
    for (const cx of [24, 40]) {
      g.rect(cx - 2, 36, cx + 2, 41, P);
      g.rect(cx - 1, 38, cx + 1, 39, hex("#f4f4fb"));
      g.px(cx, 38, hex("#1d0a38"));
    }
  },
  Heart: (g) => {
    const R = hex("#ff4d6d");
    for (const cx of [24, 40]) {
      g.px(cx - 2, 36, R); g.px(cx - 1, 36, R); g.px(cx + 1, 36, R); g.px(cx + 2, 36, R);
      g.rect(cx - 2, 37, cx + 2, 39, R);
      g.hspan(cx - 1, cx + 1, 40, R);
      g.px(cx, 41, R);
      g.px(cx - 1, 37, hex("#ffb3c1"));
    }
  },
};

// -------------------------------------------------------------- mouths
// the original nose ring is part of the body; variants add on top
export const MOUTHS = {
  Classic: () => {},
  Smile: (g) => {
    g.hspan(27, 38, 57, hex("#0a0a0e"));
    g.px(26, 56, hex("#0a0a0e")); g.px(39, 56, hex("#0a0a0e"));
  },
  Ring: (g) => {
    g.rect(31, 55, 34, 55, hex("#f5c542"));
    g.px(30, 56, hex("#f5c542")); g.px(35, 56, hex("#f5c542"));
    g.rect(31, 57, 34, 57, hex("#c99b2e"));
  },
  Cigar: (g) => {
    g.rect(38, 53, 51, 55, hex("#6b4a2f"));
    g.rect(38, 56, 51, 56, hex("#523823"));
    g.rect(52, 53, 53, 56, hex("#ff6a1a"));
    g.px(53, 54, hex("#ffd23e"));
    g.px(55, 49, hex("#9aa0ad", 150)); g.px(56, 46, hex("#9aa0ad", 110)); g.px(57, 43, hex("#9aa0ad", 70));
  },
  Pipe: (g) => {
    g.rect(38, 56, 47, 57, hex("#6b4a2f"));
    g.rect(47, 52, 51, 57, hex("#523823"));
    g.rect(48, 53, 50, 54, hex("#3a2818"));
    g.px(49, 49, hex("#9aa0ad", 140)); g.px(50, 46, hex("#9aa0ad", 90));
  },
  Tongue: (g) => {
    g.rect(29, 57, 36, 60, hex("#ff8fb0"));
    g.rect(31, 61, 34, 62, hex("#e56a90"));
    g.px(32, 58, hex("#e56a90")); g.px(33, 58, hex("#e56a90"));
  },
  "Gold Grill": (g) => {
    g.rect(26, 56, 39, 57, hex("#f5c542"));
    g.rect(26, 58, 39, 58, hex("#c99b2e"));
    for (const x of [29, 33, 37]) g.px(x, 56, hex("#fff1b8"));
  },
};

// ------------------------------------------------------------- clothes
// clothes cover the shoulders (sides) + the brisket below the chin,
// clipped to the bull silhouette so nothing spills onto the background
const onBull = (x, y) => RAW[y]?.[x] !== "." && RAW[y]?.[x] !== undefined;
const inClothes = (x, y) =>
  onBull(x, y) && ((y >= 47 && (x <= 21 || x >= 43)) || y >= 60);

function baseClothes(g, main, shade) {
  const C = hex(main), Sh = hex(shade);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      if (inClothes(x, y)) g.px(x, y, (x + y) % 7 === 0 ? Sh : C);
  // collar line following the neckline
  for (let x = 0; x < 64; x++) {
    for (let y = 46; y < 64; y++) {
      if (inClothes(x, y)) { g.px(x, y, Sh); break; }
    }
  }
}
export const CLOTHES = {
  "Black Hoodie": (g) => { baseClothes(g, "#23232e", "#15151d"); hoodieStrings(g); },
  "Blue Hoodie": (g) => { baseClothes(g, "#3a6ecc", "#28509c"); hoodieStrings(g); },
  "Orange Hoodie": (g) => { baseClothes(g, "#e07b2e", "#b35a1a"); hoodieStrings(g); },
  Suit: (g) => {
    baseClothes(g, "#1d1f2c", "#12131d");
    // lapels + shirt + tie on the brisket
    g.rect(27, 60, 38, 63, hex("#eef0f6"));
    g.rect(31, 60, 34, 63, hex("#c0392b"));
    g.px(30, 60, hex("#8e2a20")); g.px(35, 60, hex("#8e2a20"));
  },
  "Leather Jacket": (g) => {
    baseClothes(g, "#2f2a33", "#1e1a22");
    for (let y = 60; y < 64; y++) g.px(y % 2 ? 32 : 33, y, hex("#8d95a3"));
    g.hspan(2, 12, 49, hex("#443d4a")); g.hspan(51, 61, 49, hex("#443d4a"));
  },
  "Fur Coat": (g) => {
    baseClothes(g, "#c9a06a", "#a37d4c");
    const r = rng(7);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++)
        if (inClothes(x, y) && r() < 0.28)
          g.px(x, y, hex(r() < 0.5 ? "#e0bd8b" : "#8a6a3e"));
  },
  "Red Robe": (g) => {
    baseClothes(g, "#a12734", "#711722");
    for (let i = 0; i < 8; i++) {
      g.px(14 + i, 60 + Math.floor(i / 3), hex("#f5c542"));
      g.px(49 - i, 60 + Math.floor(i / 3), hex("#f5c542"));
    }
  },
  "Golden Armor": (g) => {
    baseClothes(g, "#f5c542", "#c99b2e");
    for (let x = 0; x < 64; x++) {
      if (inClothes(x, 52)) g.px(x, 52, hex("#c99b2e"));
      if (inClothes(x, 57)) g.px(x, 57, hex("#c99b2e"));
    }
    g.rect(4, 49, 10, 50, hex("#fff1b8")); g.rect(53, 49, 59, 50, hex("#fff1b8"));
  },
};
function hoodieStrings(g) {
  g.rect(17, 60, 17, 63, hex("#f4f4fb"));
  g.rect(48, 60, 48, 63, hex("#f4f4fb"));
}

// -------------------------------------------------------------- chains
function chainArc(g, c1, c2) {
  const pts = [];
  for (let x = 12; x <= 51; x++) {
    const t = (x - 31.5) / 19.5;
    const y = 58 + Math.round(3.5 * (1 - t * t) * -1 + 4); // shallow arc, low point y~62 center… keep simple
    pts.push([x, 58 + Math.round(3 * (1 - Math.abs(t)))]);
  }
  pts.forEach(([x, y], i) => g.px(x, y, i % 2 ? hex(c2) : hex(c1)));
  return pts;
}
export const CHAINS = {
  "Gold Chain": (g) => chainArc(g, "#f5c542", "#c99b2e"),
  "Ice Chain": (g) => chainArc(g, "#dff4ff", "#8fd0f0"),
  "Cuban Link": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    for (let x = 14; x <= 49; x++) {
      const t = (x - 31.5) / 19.5;
      g.px(x, 59 + Math.round(3 * (1 - Math.abs(t))), hex("#c99b2e"));
    }
  },
  Amulet: (g) => {
    chainArc(g, "#c99b2e", "#a37d20");
    g.rect(30, 61, 33, 63, hex("#b26eff"));
    g.px(30, 61, hex("#d9b8ff"));
  },
  "Purple Gem": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    g.rect(29, 61, 36, 63, hex("#8a4fd0"));
    g.rect(31, 61, 34, 62, hex("#b26eff"));
  },
  "Star Medallion": (g) => {
    chainArc(g, "#f5c542", "#c99b2e");
    g.px(32, 60, hex("#f5c542")); g.px(33, 60, hex("#f5c542"));
    g.hspan(30, 35, 61, hex("#f5c542"));
    g.hspan(31, 34, 62, hex("#fff1b8"));
    g.px(32, 63, hex("#f5c542")); g.px(33, 63, hex("#f5c542"));
  },
  "Solana Pendant": (g) => {
    chainArc(g, "#2b2b36", "#1d1d26");
    g.rect(29, 61, 36, 61, hex("#14f195"));
    g.rect(29, 62, 36, 62, hex("#9945ff"));
    g.rect(29, 63, 36, 63, hex("#3ec6ff"));
  },
};

// ---------------------------------------------------------------- hats
// skull top: y22-31, x24-41 — hats sit above/over it, horns stay visible
export const HATS = {
  "Red Cap": (g) => {
    g.rect(25, 16, 40, 22, hex("#d0342c"));
    g.rect(26, 15, 39, 15, hex("#d0342c"));
    g.hspan(26, 41, 23, hex("#8e2a20"));
    g.rect(36, 22, 49, 24, hex("#d0342c"));
    g.hspan(36, 49, 25, hex("#8e2a20"));
    g.rect(31, 13, 34, 14, hex("#8e2a20"));
  },
  Cowboy: (g) => {
    g.rect(26, 10, 39, 17, hex("#8a5a33"));
    g.rect(27, 9, 38, 9, hex("#8a5a33"));
    g.hspan(26, 39, 15, hex("#5e3c20"));
    g.rect(16, 18, 49, 21, hex("#8a5a33"));
    g.hspan(16, 49, 21, hex("#6e4526"));
    g.px(16, 17, hex("#8a5a33")); g.px(49, 17, hex("#8a5a33"));
  },
  "Top Hat": (g) => {
    g.rect(26, 4, 39, 19, hex("#16161e"));
    g.rect(26, 15, 39, 17, hex("#c0392b"));
    g.rect(20, 20, 45, 22, hex("#16161e"));
    g.rect(27, 5, 28, 12, hex("#2e2e3c"));
  },
  "Pirate Hat": (g) => {
    g.rect(22, 13, 43, 19, hex("#16161e"));
    g.rect(18, 16, 47, 21, hex("#16161e"));
    g.px(17, 15, hex("#16161e")); g.px(48, 15, hex("#16161e"));
    g.hspan(19, 46, 21, hex("#2e2e3c"));
    // skull + crossbones
    g.rect(31, 15, 34, 17, hex("#f4f4fb"));
    g.px(31, 16, hex("#16161e")); g.px(34, 16, hex("#16161e"));
    g.px(29, 18, hex("#f4f4fb")); g.px(36, 18, hex("#f4f4fb"));
  },
  "Viking Helm": (g) => {
    g.rect(25, 14, 40, 22, hex("#b7bec9"));
    g.rect(26, 13, 39, 13, hex("#b7bec9"));
    g.hspan(25, 40, 22, hex("#8d95a3"));
    g.rect(31, 10, 34, 13, hex("#8d95a3"));
    // side horns
    g.rect(21, 10, 23, 16, hex("#eef0f6"));
    g.rect(40, 10, 43, 16, hex("#eef0f6"));
    g.px(21, 9, hex("#eef0f6")); g.px(43, 9, hex("#eef0f6"));
  },
  "Wizard Hat": (g) => {
    const P = hex("#6b3fa0"), s = hex("#4d2c78");
    for (let i = 0; i < 7; i++) {
      const hw = 1 + i;
      g.hspan(32 - hw, 31 + hw, 5 + i * 2, i % 2 ? P : P);
      g.hspan(32 - hw, 31 + hw, 6 + i * 2, i % 2 ? s : P);
    }
    g.rect(21, 19, 44, 21, s);
    g.px(29, 9, hex("#f5c542")); g.px(35, 14, hex("#f5c542")); g.px(27, 16, hex("#f5c542"));
  },
  "Samurai Helm": (g) => {
    g.rect(24, 14, 41, 22, hex("#2b2b36"));
    g.hspan(24, 41, 22, hex("#1d1d26"));
    // gold maedate crest
    g.rect(31, 6, 34, 13, hex("#f5c542"));
    g.px(29, 7, hex("#f5c542")); g.px(36, 7, hex("#f5c542"));
    g.px(28, 6, hex("#f5c542")); g.px(37, 6, hex("#f5c542"));
    // red side flares
    g.rect(20, 18, 23, 23, hex("#c0392b"));
    g.rect(42, 18, 45, 23, hex("#c0392b"));
  },
  Halo: (g) => {
    g.hspan(26, 39, 6, hex("#f5c542"));
    g.hspan(24, 27, 7, hex("#f5c542")); g.hspan(38, 41, 7, hex("#f5c542"));
    g.hspan(26, 39, 8, hex("#f5c542"));
    g.hspan(28, 37, 7, hex("#fff1b8", 120));
  },
  Crown: (g) => {
    g.rect(25, 15, 40, 21, hex("#f5c542"));
    for (const x of [25, 30, 35, 40]) { g.px(x, 12, hex("#f5c542")); g.rect(x, 13, x, 14, hex("#f5c542")); }
    g.hspan(25, 40, 21, hex("#c99b2e"));
    g.px(28, 17, hex("#c0392b")); g.px(32, 17, hex("#3a6ecc")); g.px(37, 17, hex("#2f8f5b"));
  },
};

// ---------------------------------------------------------- backgrounds
function solid(c) {
  return (g) => g.rect(0, 0, 63, 63, hex(c));
}
export const BACKGROUNDS = {
  Blue: solid("#3b6fd4"),
  Purple: solid("#7b4fd0"),
  Green: solid("#2f8f5b"),
  Red: solid("#b33434"),
  Yellow: solid("#d9a832"),
  Galaxy: (g) => {
    g.rect(0, 0, 63, 63, hex("#171430"));
    const r = rng(99);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * 64), y = Math.floor(r() * 64);
      g.px(x, y, hex(r() < 0.7 ? "#f4f4fb" : "#ffd23e", r() < 0.5 ? 255 : 140));
    }
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 60), y = Math.floor(r() * 60);
      g.rect(x, y, x + 2, y + 1, hex(r() < 0.5 ? "#6b3fa0" : "#3d2a6e", 130));
    }
  },
  Matrix: (g) => {
    g.rect(0, 0, 63, 63, hex("#071009"));
    const r = rng(1337);
    for (let x = 1; x < 64; x += 4) {
      let y = Math.floor(r() * 40);
      const len = 8 + Math.floor(r() * 22);
      for (let i = 0; i < len; i++)
        g.px(x, (y + i) % 64, hex(i === len - 1 ? "#8dffb0" : i > len - 4 ? "#39d367" : "#1f7a3d"));
    }
  },
  Inferno: (g) => {
    for (let y = 0; y < 64; y++)
      g.hspan(0, 63, y, hex(y < 20 ? "#33080a" : y < 36 ? "#661111" : y < 48 ? "#a12712" : "#d84f14"));
    const r = rng(66);
    for (let x = 0; x < 64; x += 3) {
      const h = 44 - Math.floor(r() * 16);
      for (let y = h; y < 52; y++)
        g.px(x + (y % 2), y, hex(y < h + 3 ? "#ff8c1a" : "#ffb84d"));
    }
  },
  "Ice City": (g) => {
    for (let y = 0; y < 64; y++)
      g.hspan(0, 63, y, hex(y < 24 ? "#0e2440" : y < 44 ? "#1c4064" : "#2f6fa8"));
    const r = rng(12);
    let x = 0;
    while (x < 64) {
      const w = 5 + Math.floor(r() * 6);
      const top = 24 + Math.floor(r() * 20);
      g.rect(x, top, Math.min(63, x + w - 1), 63, hex("#77aed4"));
      for (let wy = top + 2; wy < 63; wy += 3)
        for (let wx = x + 1; wx < x + w - 1; wx += 2)
          if (r() < 0.5) g.px(wx, wy, hex("#dff4ff"));
      x += w + 2;
    }
  },
  "Neon Skyline": (g) => {
    for (let y = 0; y < 64; y++)
      g.hspan(0, 63, y, hex(y < 16 ? "#0b0b12" : y < 28 ? "#241436" : y < 36 ? "#4d1d55" : "#1a0f24"));
    g.hspan(0, 63, 34, hex("#ff6ec7", 180));
    g.hspan(0, 63, 35, hex("#ff6ec7", 90));
    const r = rng(2077);
    let x = 0;
    while (x < 64) {
      const w = 4 + Math.floor(r() * 7);
      const top = 32 + Math.floor(r() * 20);
      g.rect(x, top, Math.min(63, x + w - 1), 63, hex("#14101c"));
      for (let wy = top + 1; wy < 63; wy += 2)
        for (let wx = x + 1; wx < x + w - 1; wx += 2)
          if (r() < 0.45) g.px(wx, wy, hex(r() < 0.5 ? "#ff6ec7" : "#3ec6ff"));
      x += w;
    }
  },
};

// ---------------------------------------------------------------- auras
function aura(colors) {
  return (g) => {
    colors.forEach((c, i) =>
      g.ring(31.5, 40, 27.4 - i * 1.6, 29.2 - i * 1.6, hex(c, 150 - i * 40)),
    );
  };
}
export const AURAS = {
  "Pink Glow": aura(["#ff6ec7", "#ff6ec7"]),
  "Cyan Glow": aura(["#3ec6ff", "#3ec6ff"]),
  "Golden Aura": aura(["#f5c542", "#ffd23e"]),
  "Rainbow Aura": (g) => {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"];
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 40);
        if (d >= 25.6 && d <= 29.2) {
          const seg = Math.floor(((Math.atan2(y - 40, x - 31.5) + Math.PI) / (2 * Math.PI)) * 6);
          g.px(x, y, hex(cols[seg % 6], 170));
        }
      }
  },
  "Solana Aura": (g) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 40);
        if (d >= 25.6 && d <= 29.2)
          g.px(x, y, hex(y < 40 ? "#14f195" : "#9945ff", 160));
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
        for (let y = 24; y <= 46; y++) {
          const c = hex(Math.floor(y / 2) % 2 ? "#f5c542" : "#2255aa");
          g.mpx(8, y, c); g.mpx(9, y, c); g.mpx(10, y, c);
          if (y < 38) { g.mpx(11, y, c); }
        }
        g.rect(24, 12, 41, 15, hex("#f5c542"));
        g.hspan(24, 41, 13, hex("#2255aa"));
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
        g.ring(31.5, 34, 22.4, 24.6, hex("#dff4ff", 230));
        g.ring(31.5, 34, 20.4, 22.3, hex("#9ad2ee", 80));
        g.rect(14, 58, 49, 59, hex("#b7bec9"));
        g.rect(12, 60, 51, 61, hex("#8d95a3"));
      },
    }),
  "Wall Street Bull": () =>
    bull({ bg: "Ice City", body: "Brown", eyes: "Sunglasses", mouth: "Cigar", clothes: "Suit" }),
  "Pirate Bull": () =>
    bull({
      body: "Brown", horns: "Dark", mouth: "Gold Grill", clothes: "Leather Jacket", chain: "Gold Chain", hat: "Pirate Hat",
      bgFn: (g) => {
        g.rect(0, 0, 63, 63, hex("#123a5e"));
        const r = rng(4242);
        for (let x = 0; x < 64; x += 5) {
          const y = 52 + Math.floor(r() * 6);
          g.px(x, y, hex("#3ec6ff")); g.px(x + 1, y, hex("#77aed4")); g.px(x + 2, y + 1, hex("#3ec6ff", 150));
        }
      },
      extra: (g) => {
        g.rect(37, 35, 44, 42, hex("#16161e")); // patch over right eye
        g.hspan(20, 36, 34, hex("#16161e"));   // strap
        g.px(45, 33, hex("#16161e")); g.px(46, 32, hex("#16161e"));
      },
    }),
  "Alien Bull": () =>
    bull({
      bg: "Galaxy", body: "Zombie Green", horns: "Purple", chain: "Amulet",
      extra: (g) => {
        const D = hex("#0a0a10");
        for (const cx of [24, 40]) {
          g.rect(cx - 3, 35, cx + 3, 42, D);
          g.rect(cx - 2, 34, cx + 2, 34, D);
          g.px(cx - 2, 36, hex("#3ec6ff"));
        }
      },
    }),
  "God Bull": () =>
    bull({
      body: "Ghost", horns: "Golden", chain: "Star Medallion", hat: "Halo", aura: "Golden Aura",
      bgFn: (g) => {
        for (let y = 0; y < 64; y++)
          g.hspan(0, 63, y, hex(y < 16 ? "#fdf6de" : y < 40 ? "#f7e8b8" : "#eed08a"));
        const r = rng(7777);
        for (let i = 0; i < 26; i++)
          g.px(Math.floor(r() * 64), Math.floor(r() * 28), hex("#ffffff"));
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
  console.log(`layers written to ${LAYERS}`);
}

main();
