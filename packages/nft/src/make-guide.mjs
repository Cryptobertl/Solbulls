#!/usr/bin/env node
/**
 * Builds the "SolBulls Master Guide" info sheet from the REAL generated
 * layers — replaces the early mockup. Output:
 *   apps/web/public/bull-society-master-guide.png (also assets/img/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const L = (c, n) => path.join(ROOT, "layers", c, `${n}.png`);

const THUMB = 110, GAP = 6, LABEL_W = 190, PAD = 24;
const WIDTH = LABEL_W + 10 * (THUMB + GAP) + PAD * 2;

async function thumb(stack, size = THUMB) {
  const [base, ...rest] = stack;
  const flat = await sharp(base).composite(rest.map((input) => ({ input }))).png().toBuffer();
  return sharp(flat).resize(size, size, { kernel: "nearest" }).png().toBuffer();
}

const DARK = path.join(ROOT, "layers", "_dark.png");
// neutral dark background tile for trait thumbs
await sharp({ create: { width: 100, height: 100, channels: 4, background: "#101018" } })
  .png().toFile(DARK);

const ROWS = [
  { label: "BODIES", cat: "Body", items: ["Classic White", "Black", "Brown", "Grey", "Zombie Green", "Golden", "Robot", "Ice", "Lava", "Ghost"], stack: (n) => [DARK, L("Body", n), L("Horns", "Classic Tan"), L("Eyes", "Classic")] },
  { label: "HORNS", cat: "Horns", items: ["Classic Tan", "Dark", "Curved Red", "Golden", "Ice Blue", "Purple", "Flaming", "Rainbow"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", n), L("Eyes", "Classic")] },
  { label: "EYES", cat: "Eyes", items: ["Classic", "Green", "Blue", "Sunglasses", "Cyber Visor", "Red Glow", "Laser", "Dead X", "Hypno", "Heart"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", n)] },
  { label: "MOUTHS", cat: "Mouth", items: ["Classic", "Smile", "Ring", "Cigar", "Pipe", "Tongue", "Gold Grill"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic"), L("Mouth", n)] },
  { label: "HATS", cat: "Hat", items: ["Red Cap", "Cowboy", "Top Hat", "Pirate Hat", "Viking Helm", "Wizard Hat", "Samurai Helm", "Halo", "Crown"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic"), L("Hat", n)] },
  { label: "CLOTHES", cat: "Clothes", items: ["Black Hoodie", "Blue Hoodie", "Orange Hoodie", "Suit", "Leather Jacket", "Fur Coat", "Red Robe", "Golden Armor"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic"), L("Clothes", n)] },
  { label: "CHAINS", cat: "Chain", items: ["Gold Chain", "Ice Chain", "Cuban Link", "Amulet", "Purple Gem", "Star Medallion", "Solana Pendant"], stack: (n) => [DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic"), L("Chain", n)] },
  { label: "BACKGROUNDS", cat: "Background", items: ["Blue", "Purple", "Green", "Red", "Yellow", "Galaxy", "Matrix", "Inferno", "Ice City", "Neon Skyline"], stack: (n) => [L("Background", n)] },
  { label: "AURAS", cat: "Aura", items: ["Pink Glow", "Cyan Glow", "Golden Aura", "Rainbow Aura", "Solana Aura"], stack: (n) => [DARK, L("Aura", n), L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic")] },
];
const LEGENDARIES = ["Samurai Bull", "Pharaoh Bull", "Cyber Bull", "King Bull", "Demon Bull", "Astronaut Bull", "Wall Street Bull", "Pirate Bull", "Alien Bull", "God Bull"];

const HEADER_H = 320, ROW_H = THUMB + 34, LEG_H = 210, FOOTER_H = 40;
const HEIGHT = HEADER_H + ROWS.length * ROW_H + 70 + LEG_H + FOOTER_H;

const svgText = (t, x, y, size, fill, weight = 700, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;

let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#ff6ec7"/><stop offset="0.4" stop-color="#b26eff"/>
  <stop offset="0.75" stop-color="#3ec6ff"/><stop offset="1" stop-color="#4dffb8"/></linearGradient></defs>`;
svg += svgText("SOLBULLS", PAD + 200, 96, 64, "#f4f4fb");
svg += svgText("MASTER GUIDE", PAD + 200, 148, 40, "url(#g)");
svg += svgText("THE ORIGINAL SOLANA BULL — 100×100 NATIVE PIXELS — LAYER-BASED", PAD + 200, 188, 19, "#9a9ab0");
const info = [
  ["SERIES 1 SUPPLY", "999 BULLS (MAX 2,222 IN LATER SERIES)"],
  ["MINT", `BURN ~0.05 SOL WORTH OF $SOLBULLS`],
  ["CHAIN / STANDARD", "SOLANA · METAPLEX CORE"],
  ["ALLOWLIST", "100 RAREST BULLS RESERVED FOR HOLDERS"],
];
info.forEach(([k, v], i) => {
  svg += svgText(k, PAD + 200, 226 + i * 26, 16, "#ff6ec7");
  svg += svgText(v, PAD + 430, 226 + i * 26, 16, "#f4f4fb", 400);
});
ROWS.forEach((row, r) => {
  const y = HEADER_H + r * ROW_H;
  svg += svgText(row.label, PAD, y + THUMB / 2 + 8, 22, "url(#g)");
  svg += svgText(`${row.items.length}`, PAD, y + THUMB / 2 + 32, 16, "#9a9ab0");
});
svg += svgText("LEGENDARY 1/1 BULLS", PAD, HEADER_H + ROWS.length * ROW_H + 46, 26, "url(#g)");
LEGENDARIES.forEach((n, i) => {
  const x = PAD + i * ((WIDTH - PAD * 2) / 10) + ((WIDTH - PAD * 2) / 10) / 2;
  svg += svgText(n.replace(" Bull", "").toUpperCase(), x, HEADER_H + ROWS.length * ROW_H + 70 + 140 + 24, 13, "#f4f4fb", 700, "middle");
});
svg += svgText("solbulls.xyz — every layer drawn in code, collection reproducible from the committed seed", PAD, HEIGHT - 14, 15, "#9a9ab0", 400);
svg += "</svg>";

const composites = [{ input: Buffer.from(svg), left: 0, top: 0 }];

// header bull (the original, on dark)
composites.push({
  input: await thumb([DARK, L("Body", "Classic White"), L("Horns", "Classic Tan"), L("Eyes", "Classic")], 170),
  left: PAD, top: 60,
});

for (let r = 0; r < ROWS.length; r++) {
  const row = ROWS[r];
  for (let i = 0; i < row.items.length; i++) {
    composites.push({
      input: await thumb(row.stack(row.items[i])),
      left: LABEL_W + PAD + i * (THUMB + GAP),
      top: HEADER_H + r * ROW_H,
    });
  }
}
const legY = HEADER_H + ROWS.length * ROW_H + 70;
const cellW = (WIDTH - PAD * 2) / 10;
for (let i = 0; i < LEGENDARIES.length; i++) {
  composites.push({
    input: await thumb([L("Legendaries", LEGENDARIES[i])], 140),
    left: Math.round(PAD + i * cellW + (cellW - 140) / 2),
    top: legY,
  });
}

const out = await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#050506" },
})
  .composite(composites)
  .png()
  .toBuffer();

const dest1 = path.resolve(ROOT, "../../apps/web/public/bull-society-master-guide.png");
const dest2 = path.resolve(ROOT, "../../assets/img/bull-society-master-guide.png");
fs.writeFileSync(dest1, out);
fs.writeFileSync(dest2, out);
fs.rmSync(DARK, { force: true });
console.log(`master guide written: ${dest1} (${WIDTH}x${HEIGHT})`);
