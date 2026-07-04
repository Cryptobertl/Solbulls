#!/usr/bin/env node
/**
 * Renders every trait layer in traits.config.json as pixel art, plus the
 * ten legendary 1/1 bulls. Output: layers/<Category>/<Trait>.png (64x64).
 *
 * The base bull is modeled on the original SolBulls logo: white bull
 * head-and-shoulders, pink muzzle/chest, curved horns. Everything is
 * drawn in code so the whole collection is reproducible from source.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, hex, rng } from "./pixel.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LAYERS = path.join(ROOT, "layers");

// ---------------------------------------------------------------- bodies
// palette: W fur, w fur shade, P muzzle/chest, p muzzle shade, E ear inner
const BODY_PALETTES = {
  "Classic White": { W: "#f2f2f7", w: "#d5d5e2", P: "#f0b8c8", p: "#d795ab", E: "#e8a7b8" },
  Black:           { W: "#33333f", w: "#232330", P: "#565664", p: "#434351", E: "#4b4b59" },
  Brown:           { W: "#8a5a33", w: "#6e4526", P: "#c48a5e", p: "#a9744c", E: "#b07a50" },
  Grey:            { W: "#9aa0ad", w: "#7c8290", P: "#bcc2ce", p: "#a2a8b4", E: "#adb3bf" },
  "Zombie Green":  { W: "#7fae6a", w: "#628c50", P: "#a5c98f", p: "#8bb076", E: "#97bd82" },
  Golden:          { W: "#f5c542", w: "#cfa02c", P: "#f7dd8a", p: "#e0c15f", E: "#eed07a" },
  Robot:           { W: "#b7bec9", w: "#8d95a3", P: "#6f7885", p: "#596170", E: "#7f8894" },
  Ice:             { W: "#bfe6f5", w: "#8fc9e3", P: "#e2f4fb", p: "#bfe0f0", E: "#d3ecf8" },
  Lava:            { W: "#e04a2a", w: "#ad3316", P: "#ffa34d", p: "#f07a28", E: "#ff8f3d" },
  Ghost:           { W: "#dfe6f5", w: "#b6c1dc", P: "#eef2fb", p: "#cdd6eb", E: "#dbe2f3" },
};

// head half-widths per row (y3..y20), then chest (y21..y31)
const HEAD = [
  [3, 5], [4, 7], [5, 8], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
  [12, 8], [13, 8], [14, 7], [15, 7], [16, 7], [17, 7], [18, 6], [19, 6], [20, 5],
];
const CHEST = [
  [21, 6], [22, 8], [23, 9], [24, 10], [25, 11], [26, 11], [27, 12], [28, 12],
  [29, 12], [30, 12], [31, 12],
];
const MUZZLE = [
  [14, 5], [15, 6], [16, 6], [17, 6], [18, 5], [19, 4],
];

export function drawBody(g, pal) {
  const W = hex(pal.W), w = hex(pal.w), P = hex(pal.P), p = hex(pal.p), E = hex(pal.E);
  for (const [y, hw] of [...HEAD, ...CHEST]) g.cspan(y, hw, W);
  // right-side + bottom shading
  for (const [y, hw] of [...HEAD, ...CHEST]) {
    g.px(15 + hw, y, w);
    g.px(14 + hw, y, w);
  }
  g.cspan(20, 5, w);
  // muzzle
  for (const [y, hw] of MUZZLE) g.cspan(y, hw, P);
  g.cspan(19, 4, p);
  g.px(15 + 6, 16, p); g.px(15 + 6, 17, p);
  // chest patch
  for (let y = 24; y <= 31; y++) g.cspan(y, 4, P);
  for (let y = 29; y <= 31; y++) g.cspan(y, 4, p);
  // ears (outer fur + inner)
  for (const [ex, ey] of [[5, 10], [4, 11], [4, 12], [5, 13]]) {
    g.mpx(ex, ey, W); g.mpx(ex + 1, ey, W); g.mpx(ex + 2, ey, W);
  }
  g.mpx(5, 11, E); g.mpx(5, 12, E); g.mpx(6, 12, E);
  // brow notches for character
  g.mpx(11, 8, w); g.mpx(12, 8, w);
  return g;
}

// ---------------------------------------------------------------- horns
const HORN_PALETTES = {
  "Classic Tan": { H: "#d9a066", h: "#b07a45" },
  Dark:          { H: "#4a3b2f", h: "#332821" },
  "Curved Red":  { H: "#c0392b", h: "#8e2a20" },
  Golden:        { H: "#f5c542", h: "#c99b2e" },
  "Ice Blue":    { H: "#a8d8f0", h: "#7fb8dc" },
  Purple:        { H: "#b26eff", h: "#8a4fd0" },
};
const HORN_SPANS = [
  // [y, x0, x1] for the LEFT horn; mirrored for right
  [1, 5, 6], [2, 4, 6], [3, 3, 5], [4, 3, 5], [5, 3, 6], [6, 4, 7], [7, 6, 9], [8, 8, 10],
];
export function drawHorns(g, pal, opts = {}) {
  const H = hex(pal.H), h = hex(pal.h);
  for (const [y, x0, x1] of HORN_SPANS) {
    for (let x = x0; x <= x1; x++) g.mpx(x, y, H);
    g.mpx(x1, y, h); // inner shade
  }
  if (opts.flames) {
    const F = hex("#ff8c1a"), Y = hex("#ffd23e");
    for (const [x, y] of [[4, 1], [5, 0], [6, 2], [3, 3], [6, 4], [3, 6]]) g.mpx(x, y, F);
    for (const [x, y] of [[5, 1], [4, 2], [5, 3]]) g.mpx(x, y, Y);
  }
  if (opts.rainbow) {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"];
    HORN_SPANS.forEach(([y, x0, x1], i) => {
      const c = hex(cols[i % cols.length]);
      for (let x = x0; x <= x1; x++) g.mpx(x, y, c);
    });
  }
  return g;
}

// ---------------------------------------------------------------- eyes
export const EYES = {
  Classic: (g) => {
    eye(g, "#14141c"); glint(g, "#ffffff");
  },
  Green: (g) => { eye(g, "#2f8f5b"); pupil(g, "#0c2417"); },
  Blue: (g) => { eye(g, "#3a6ecc"); pupil(g, "#0d1a33"); },
  Sunglasses: (g) => {
    g.rect(9, 9, 22, 11, hex("#181820"));
    g.rect(10, 10, 13, 10, hex("#2e2e3c"));
    g.rect(18, 10, 21, 10, hex("#2e2e3c"));
    g.hspan(14, 17, 9, hex("#181820"));
  },
  "Cyber Visor": (g) => {
    g.rect(8, 9, 23, 11, hex("#0e2430"));
    g.rect(9, 10, 22, 10, hex("#3ec6ff"));
    g.px(10, 10, hex("#bdf0ff")); g.px(11, 10, hex("#bdf0ff"));
  },
  "Red Glow": (g) => {
    eye(g, "#ff3b3b");
    for (const [x, y] of [[10, 10], [13, 10], [11, 8], [12, 12]]) g.mpx(x, y, hex("#ff3b3b", 110));
  },
  Laser: (g) => {
    eye(g, "#ff2020");
    g.hspan(0, 10, 10, hex("#ff2020", 200));
    g.hspan(21, 31, 10, hex("#ff2020", 200));
    g.hspan(0, 10, 9, hex("#ff6a4d", 90));
    g.hspan(21, 31, 9, hex("#ff6a4d", 90));
  },
  "Dead X": (g) => {
    for (const [x, y] of [[10, 9], [12, 9], [11, 10], [10, 11], [12, 11]]) g.mpx(x, y, hex("#14141c"));
  },
  Hypno: (g) => {
    for (const [x, y] of [[10, 9], [11, 9], [12, 9], [10, 10], [12, 10], [10, 11], [11, 11], [12, 11]])
      g.mpx(x, y, hex("#b26eff"));
    g.mpx(11, 10, hex("#f4f4fb"));
  },
  Heart: (g) => {
    for (const [x, y] of [[10, 9], [12, 9], [10, 10], [11, 10], [12, 10], [11, 11]])
      g.mpx(x, y, hex("#ff4d6d"));
  },
};
function eye(g, c) {
  g.mpx(11, 9, hex(c)); g.mpx(12, 9, hex(c));
  g.mpx(11, 10, hex(c)); g.mpx(12, 10, hex(c));
}
function pupil(g, c) { g.mpx(12, 10, hex(c)); }
function glint(g, c) { g.px(11, 9, hex(c)); g.px(31 - 12, 9, hex(c)); }

// ---------------------------------------------------------------- mouths
function nostrils(g) {
  g.mpx(13, 16, hex("#201018")); g.mpx(13, 17, hex("#201018"));
}
export const MOUTHS = {
  Classic: (g) => nostrils(g),
  Smile: (g) => { nostrils(g); g.hspan(13, 18, 19, hex("#20101880")=== null ? hex("#201018") : hex("#201018")); },
  Ring: (g) => {
    nostrils(g);
    g.px(15, 19, hex("#f5c542")); g.px(16, 19, hex("#f5c542"));
    g.px(15, 20, hex("#c99b2e")); g.px(16, 20, hex("#c99b2e"));
  },
  Cigar: (g) => {
    nostrils(g);
    g.hspan(18, 24, 18, hex("#6b4a2f"));
    g.hspan(18, 24, 19, hex("#523823"));
    g.px(25, 18, hex("#ff6a1a")); g.px(25, 19, hex("#ffd23e"));
    g.px(26, 15, hex("#9aa0ad", 150)); g.px(27, 13, hex("#9aa0ad", 100));
  },
  Pipe: (g) => {
    nostrils(g);
    g.hspan(18, 22, 19, hex("#6b4a2f"));
    g.rect(22, 17, 24, 19, hex("#523823"));
    g.px(23, 15, hex("#9aa0ad", 140)); g.px(24, 13, hex("#9aa0ad", 90));
  },
  Tongue: (g) => {
    nostrils(g);
    g.rect(14, 19, 17, 20, hex("#ff8fb0"));
    g.rect(15, 21, 16, 21, hex("#e56a90"));
  },
  "Gold Grill": (g) => {
    nostrils(g);
    g.hspan(12, 19, 19, hex("#f5c542"));
    g.hspan(12, 19, 20, hex("#c99b2e"));
    g.px(14, 19, hex("#fff1b8")); g.px(17, 19, hex("#fff1b8"));
  },
};

// ---------------------------------------------------------------- clothes
function torso(g, y0, color, { vneck = 0, shade } = {}) {
  const C = hex(color);
  for (const [y, hw] of CHEST) {
    if (y < y0) continue;
    g.cspan(y, hw, C);
  }
  if (vneck) {
    for (let i = 0; i < vneck; i++) g.cspan(22 + i, vneck - i, [0, 0, 0, 0]);
  }
  if (shade) {
    const s = hex(shade);
    for (const [y, hw] of CHEST) if (y >= y0) { g.px(15 + hw, y, s); g.px(14 + hw, y, s); }
  }
}
// clothes need to CUT the vneck — Layer has no erase, so draw with spans instead
function shirt(g, color, shade, vdepth = 3) {
  const C = hex(color), Sh = hex(shade);
  for (const [y, hw] of CHEST) {
    if (y === 21) continue;
    const v = Math.max(0, vdepth - (y - 22)); // v-neck gap half-width
    if (v > 0 && y <= 25) {
      g.hspan(16 - hw, 15 - v, y, C);
      g.hspan(16 + v, 15 + hw, y, C);
    } else {
      g.cspan(y, hw, C);
    }
    g.px(15 + hw, y, Sh); g.px(14 + hw, y, Sh);
  }
}
export const CLOTHES = {
  "Black Hoodie": (g) => { shirt(g, "#23232e", "#15151d"); hood(g, "#23232e", "#15151d"); strings(g); },
  "Blue Hoodie": (g) => { shirt(g, "#3a6ecc", "#28509c"); hood(g, "#3a6ecc", "#28509c"); strings(g); },
  "Orange Hoodie": (g) => { shirt(g, "#e07b2e", "#b35a1a"); hood(g, "#e07b2e", "#b35a1a"); strings(g); },
  Suit: (g) => {
    shirt(g, "#1d1f2c", "#12131d", 4);
    // shirt + tie
    for (let y = 22; y <= 26; y++) {
      const v = Math.max(1, 4 - (y - 22));
      g.hspan(16 - v, 15 + v, y, hex("#eef0f6"));
    }
    g.rect(15, 23, 16, 28, hex("#c0392b"));
    g.px(15, 22, hex("#8e2a20")); g.px(16, 22, hex("#8e2a20"));
  },
  "Leather Jacket": (g) => {
    shirt(g, "#2f2a33", "#1e1a22", 3);
    for (let y = 22; y <= 31; y++) g.px(y % 2 ? 15 : 16, y, hex("#8d95a3")); // zipper
    g.hspan(9, 13, 22, hex("#443d4a")); g.hspan(18, 22, 22, hex("#443d4a")); // collar
  },
  "Fur Coat": (g) => {
    shirt(g, "#c9a06a", "#a37d4c", 2);
    const r = rng(7);
    for (const [y, hw] of CHEST) {
      if (y === 21) continue;
      for (let x = 16 - hw; x <= 15 + hw; x++)
        if (r() < 0.25) g.px(x, y, hex(r() < 0.5 ? "#e0bd8b" : "#8a6a3e"));
    }
  },
  "Red Robe": (g) => {
    shirt(g, "#a12734", "#711722", 3);
    for (let i = 0; i <= 3; i++) { g.mpx(12 + i, 22 + i, hex("#f5c542")); } // gold trim V
    g.mpx(11, 22, hex("#f5c542"));
  },
  "Golden Armor": (g) => {
    shirt(g, "#f5c542", "#c99b2e", 2);
    g.hspan(6, 25, 24, hex("#c99b2e"));
    g.hspan(5, 26, 27, hex("#c99b2e"));
    g.hspan(8, 11, 22, hex("#fff1b8")); g.hspan(20, 23, 22, hex("#fff1b8")); // shoulder shine
  },
};
function hood(g, c, s) {
  g.hspan(8, 23, 21, hex(s));
  g.hspan(7, 24, 22, hex(c));
  g.mpx(8, 23, hex(c)); g.mpx(7, 24, hex(c));
}
function strings(g) {
  g.px(13, 23, hex("#f4f4fb")); g.px(13, 24, hex("#f4f4fb"));
  g.px(18, 23, hex("#f4f4fb")); g.px(18, 24, hex("#f4f4fb"));
}

// ---------------------------------------------------------------- chains
function chainRow(g, y, c1, c2) {
  for (let x = 10; x <= 21; x++) g.px(x, y + ((x % 2) ? 1 : 0), hex(x % 2 ? c2 : c1));
}
export const CHAINS = {
  "Gold Chain": (g) => chainRow(g, 23, "#f5c542", "#c99b2e"),
  "Ice Chain": (g) => chainRow(g, 23, "#dff4ff", "#8fd0f0"),
  "Cuban Link": (g) => {
    g.hspan(10, 21, 23, hex("#f5c542"));
    g.hspan(10, 21, 24, hex("#c99b2e"));
  },
  Amulet: (g) => {
    chainRow(g, 23, "#c99b2e", "#a37d20");
    g.rect(15, 25, 16, 27, hex("#b26eff"));
    g.px(15, 25, hex("#d9b8ff"));
  },
  "Purple Gem": (g) => {
    chainRow(g, 23, "#f5c542", "#c99b2e");
    g.rect(14, 25, 17, 27, hex("#8a4fd0"));
    g.rect(15, 25, 16, 26, hex("#b26eff"));
  },
  "Star Medallion": (g) => {
    chainRow(g, 23, "#f5c542", "#c99b2e");
    g.px(15, 25, hex("#f5c542")); g.px(16, 25, hex("#f5c542"));
    g.hspan(14, 17, 26, hex("#f5c542"));
    g.px(15, 27, hex("#f5c542")); g.px(16, 27, hex("#f5c542"));
    g.px(15, 26, hex("#fff1b8")); g.px(16, 26, hex("#fff1b8"));
  },
  "Solana Pendant": (g) => {
    chainRow(g, 23, "#2b2b36", "#1d1d26");
    g.hspan(14, 17, 25, hex("#14f195"));
    g.hspan(14, 17, 26, hex("#9945ff"));
    g.hspan(14, 17, 27, hex("#3ec6ff"));
  },
};

// ---------------------------------------------------------------- hats
export const HATS = {
  "Red Cap": (g) => {
    g.rect(11, 2, 20, 4, hex("#d0342c"));
    g.hspan(12, 21, 5, hex("#8e2a20"));
    g.hspan(17, 25, 5, hex("#d0342c"));
    g.px(15, 1, hex("#8e2a20")); g.px(16, 1, hex("#8e2a20"));
  },
  Cowboy: (g) => {
    g.rect(11, 1, 20, 4, hex("#8a5a33"));
    g.hspan(12, 19, 3, hex("#5e3c20"));
    g.hspan(6, 25, 5, hex("#8a5a33"));
    g.hspan(6, 25, 4, hex("#6e4526"));
  },
  "Top Hat": (g) => {
    g.rect(11, 0, 20, 5, hex("#16161e"));
    g.hspan(11, 20, 4, hex("#c0392b"));
    g.hspan(8, 23, 6, hex("#16161e"));
  },
  "Pirate Hat": (g) => {
    g.rect(10, 2, 21, 4, hex("#16161e"));
    g.hspan(7, 24, 5, hex("#16161e"));
    g.px(7, 4, hex("#16161e")); g.px(24, 4, hex("#16161e"));
    g.px(15, 3, hex("#f4f4fb")); g.px(16, 3, hex("#f4f4fb")); // skull
    g.px(15, 4, hex("#f4f4fb")); g.px(16, 4, hex("#f4f4fb"));
  },
  "Viking Helm": (g) => {
    g.rect(11, 2, 20, 5, hex("#b7bec9"));
    g.hspan(11, 20, 5, hex("#8d95a3"));
    g.px(15, 1, hex("#8d95a3")); g.px(16, 1, hex("#8d95a3"));
    g.mpx(9, 1, hex("#eef0f6")); g.mpx(10, 2, hex("#eef0f6")); g.mpx(9, 0, hex("#eef0f6"));
  },
  "Wizard Hat": (g) => {
    const P = hex("#6b3fa0"), s = hex("#4d2c78");
    g.hspan(15, 16, 0, P);
    g.hspan(14, 17, 1, P);
    g.hspan(13, 18, 2, P);
    g.hspan(12, 19, 3, s);
    g.hspan(11, 20, 4, P);
    g.hspan(9, 22, 5, s);
    g.px(14, 2, hex("#f5c542")); g.px(17, 4, hex("#f5c542"));
  },
  "Samurai Helm": (g) => {
    g.rect(11, 2, 20, 5, hex("#2b2b36"));
    g.hspan(11, 20, 5, hex("#1d1d26"));
    g.px(15, 0, hex("#f5c542")); g.px(16, 0, hex("#f5c542"));
    g.px(14, 1, hex("#f5c542")); g.px(17, 1, hex("#f5c542"));
    g.px(13, 2, hex("#f5c542")); g.px(18, 2, hex("#f5c542"));
    g.mpx(10, 4, hex("#c0392b")); g.mpx(10, 5, hex("#c0392b"));
  },
  Halo: (g) => {
    g.hspan(12, 19, 0, hex("#f5c542"));
    g.px(11, 1, hex("#f5c542")); g.px(20, 1, hex("#f5c542"));
    g.hspan(12, 19, 1, hex("#fff1b8", 90));
  },
  Crown: (g) => {
    g.rect(11, 2, 20, 4, hex("#f5c542"));
    for (const x of [11, 14, 17, 20]) g.px(x, 1, hex("#f5c542"));
    g.px(12, 3, hex("#c0392b")); g.px(15, 3, hex("#3a6ecc")); g.px(19, 3, hex("#2f8f5b"));
    g.hspan(11, 20, 4, hex("#c99b2e"));
  },
};

// ---------------------------------------------------------------- backgrounds
function solid(c) {
  return (g) => g.rect(0, 0, 31, 31, hex(c));
}
export const BACKGROUNDS = {
  Blue: solid("#3b6fd4"),
  Purple: solid("#7b4fd0"),
  Green: solid("#2f8f5b"),
  Red: solid("#b33434"),
  Yellow: solid("#d9a832"),
  Galaxy: (g) => {
    g.rect(0, 0, 31, 31, hex("#171430"));
    const r = rng(99);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
      g.px(x, y, hex(r() < 0.7 ? "#f4f4fb" : "#ffd23e", r() < 0.5 ? 255 : 150));
    }
    for (const [x, y] of [[6, 6], [7, 6], [6, 7], [24, 20], [25, 20], [25, 21], [24, 26]])
      g.px(x, y, hex("#6b3fa0", 160));
    for (const [x, y] of [[7, 7], [25, 19], [23, 25]]) g.px(x, y, hex("#b26eff", 140));
  },
  Matrix: (g) => {
    g.rect(0, 0, 31, 31, hex("#071009"));
    const r = rng(1337);
    for (let x = 1; x < 32; x += 3) {
      let y = Math.floor(r() * 20);
      const len = 4 + Math.floor(r() * 10);
      for (let i = 0; i < len; i++) {
        g.px(x, (y + i) % 32, hex(i === len - 1 ? "#8dffb0" : "#1f7a3d"));
      }
    }
  },
  Inferno: (g) => {
    for (let y = 0; y < 32; y++)
      g.hspan(0, 31, y, hex(y < 10 ? "#33080a" : y < 18 ? "#661111" : y < 24 ? "#a12712" : "#d84f14"));
    const r = rng(66);
    for (let x = 0; x < 32; x += 2) {
      const h = 22 - Math.floor(r() * 8);
      for (let y = h; y < 26; y++) g.px(x + (y % 2), y, hex(y < h + 2 ? "#ff8c1a" : "#ffb84d"));
    }
  },
  "Ice City": (g) => {
    for (let y = 0; y < 32; y++)
      g.hspan(0, 31, y, hex(y < 12 ? "#0e2440" : y < 22 ? "#1c4064" : "#2f6fa8"));
    const r = rng(12);
    let x = 0;
    while (x < 32) {
      const w = 3 + Math.floor(r() * 3);
      const top = 12 + Math.floor(r() * 10);
      g.rect(x, top, Math.min(31, x + w - 1), 31, hex("#77aed4"));
      for (let wy = top + 1; wy < 31; wy += 2)
        for (let wx = x + 1; wx < x + w - 1; wx += 2)
          if (r() < 0.5) g.px(wx, wy, hex("#dff4ff"));
      x += w + 1;
    }
  },
  "Neon Skyline": (g) => {
    for (let y = 0; y < 32; y++)
      g.hspan(0, 31, y, hex(y < 8 ? "#0b0b12" : y < 14 ? "#241436" : y < 18 ? "#4d1d55" : "#1a0f24"));
    g.hspan(0, 31, 17, hex("#ff6ec7", 170));
    const r = rng(2077);
    let x = 0;
    while (x < 32) {
      const w = 2 + Math.floor(r() * 4);
      const top = 16 + Math.floor(r() * 10);
      g.rect(x, top, Math.min(31, x + w - 1), 31, hex("#14101c"));
      for (let wy = top + 1; wy < 31; wy += 2)
        for (let wx = x; wx < x + w - 1; wx += 2)
          if (r() < 0.45) g.px(wx, wy, hex(r() < 0.5 ? "#ff6ec7" : "#3ec6ff"));
      x += w;
    }
  },
};

// ---------------------------------------------------------------- auras
function aura(colors) {
  return (g) => {
    colors.forEach((c, i) => {
      g.ring(15.5, 16, 13.2 - i, 14.4 - i, hex(c, 150 - i * 40));
    });
  };
}
export const AURAS = {
  "Pink Glow": aura(["#ff6ec7", "#ff6ec7"]),
  "Cyan Glow": aura(["#3ec6ff", "#3ec6ff"]),
  "Golden Aura": aura(["#f5c542", "#ffd23e"]),
  "Rainbow Aura": (g) => {
    const cols = ["#ff5f6d", "#ffb14a", "#f9f871", "#4dffb8", "#3ec6ff", "#b26eff"];
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 15.5, y - 16);
        if (d >= 12.4 && d <= 14.4) {
          const seg = Math.floor(((Math.atan2(y - 16, x - 15.5) + Math.PI) / (2 * Math.PI)) * 6);
          g.px(x, y, hex(cols[seg % 6], 170));
        }
      }
  },
  "Solana Aura": (g) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 15.5, y - 16);
        if (d >= 12.4 && d <= 14.4)
          g.px(x, y, hex(y < 16 ? "#14f195" : "#9945ff", 160));
      }
  },
};

// ---------------------------------------------------------------- legendary 1/1s
function bull(opts) {
  const g = new Layer();
  if (opts.bg) BACKGROUNDS[opts.bg]?.(g) ?? opts.bgFn?.(g);
  if (opts.bgFn) opts.bgFn(g);
  if (opts.aura) AURAS[opts.aura](g);
  drawBody(g, BODY_PALETTES[opts.body]);
  if (opts.horns !== null) drawHorns(g, HORN_PALETTES[opts.horns ?? "Classic Tan"], opts.hornOpts ?? {});
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
      bg: "Yellow", body: "Golden", horns: "Golden", eyes: "Classic", clothes: "Golden Armor", chain: "Amulet",
      extra: (g) => {
        // nemes headdress side flaps
        for (let y = 3; y <= 13; y++) {
          const c = hex(y % 2 ? "#f5c542" : "#2255aa");
          g.mpx(4, y, c); g.mpx(5, y, c); g.mpx(6, y < 9 ? y : 8, c);
        }
        g.rect(11, 1, 20, 3, hex("#f5c542"));
        g.hspan(11, 20, 2, hex("#2255aa"));
      },
    }),
  "Cyber Bull": () =>
    bull({ bg: "Matrix", body: "Robot", horns: "Ice Blue", eyes: "Cyber Visor", clothes: "Leather Jacket", chain: "Solana Pendant" }),
  "King Bull": () =>
    bull({ bg: "Purple", body: "Classic White", horns: "Golden", eyes: "Classic", clothes: "Red Robe", chain: "Gold Chain", hat: "Crown", aura: "Golden Aura" }),
  "Demon Bull": () =>
    bull({
      bg: "Inferno", body: "Black", horns: "Curved Red", hornOpts: { flames: true }, eyes: "Red Glow", mouth: "Smile",
      extra: (g) => { g.mpx(11, 8, hex("#ff3b3b")); },
    }),
  "Astronaut Bull": () =>
    bull({
      bg: "Galaxy", body: "Classic White", horns: null, eyes: "Classic", clothes: "Fur Coat",
      extra: (g) => {
        // glass dome
        g.ring(15.5, 11, 10.2, 11.4, hex("#dff4ff", 220));
        g.ring(15.5, 11, 9.2, 10.1, hex("#9ad2ee", 90));
        // suit collar
        g.hspan(8, 23, 21, hex("#b7bec9"));
        g.hspan(7, 24, 22, hex("#8d95a3"));
      },
    }),
  "Wall Street Bull": () =>
    bull({ bg: "Ice City", body: "Brown", horns: "Classic Tan", eyes: "Sunglasses", mouth: "Cigar", clothes: "Suit", chain: null }),
  "Pirate Bull": () =>
    bull({
      bg: "Blue", body: "Brown", horns: "Dark", eyes: "Classic", mouth: "Gold Grill", clothes: "Leather Jacket", chain: "Gold Chain", hat: "Pirate Hat",
      bgFn: (g) => {
        g.rect(0, 0, 31, 31, hex("#123a5e"));
        for (let x = 0; x < 32; x += 4) { g.px(x, 27 + (x / 4) % 2, hex("#3ec6ff")); g.px(x + 1, 27 + (x / 4) % 2, hex("#77aed4")); }
      },
      extra: (g) => {
        g.rect(18, 9, 21, 11, hex("#16161e")); // eye patch (right eye)
        g.hspan(9, 17, 8, hex("#16161e"));
        g.px(22, 8, hex("#16161e"));
      },
    }),
  "Alien Bull": () =>
    bull({
      bg: "Galaxy", body: "Zombie Green", horns: "Purple", eyes: "Classic", chain: "Amulet",
      extra: (g) => {
        // big black alien eyes over the standard ones
        for (const [x, y] of [[10, 9], [11, 9], [12, 9], [10, 10], [11, 10], [12, 10], [11, 11], [12, 11]])
          g.mpx(x, y, hex("#0a0a10"));
        g.mpx(10, 9, hex("#3ec6ff"));
      },
    }),
  "God Bull": () =>
    bull({
      body: "Ghost", horns: "Golden", eyes: "Classic", clothes: null, chain: "Star Medallion", hat: "Halo", aura: "Golden Aura",
      bgFn: (g) => {
        for (let y = 0; y < 32; y++) g.hspan(0, 31, y, hex(y < 8 ? "#fdf6de" : y < 20 ? "#f7e8b8" : "#eed08a"));
        const r = rng(7777);
        for (let i = 0; i < 10; i++) g.px(Math.floor(r() * 32), Math.floor(r() * 14), hex("#ffffff"));
      },
    }),
};

// ---------------------------------------------------------------- main
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
    const g = new Layer(); drawHorns(g, HORN_PALETTES["Classic Tan"], { flames: true });
    await write("Horns", "Flaming", g);
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
