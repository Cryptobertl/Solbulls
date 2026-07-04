#!/usr/bin/env node
/**
 * SolBull collection generator.
 *
 * Reads traits.config.json, then:
 *   1. Deterministically (seeded RNG) picks weighted traits per bull,
 *      enforcing uniqueness and exclusion rules.
 *   2. Composites layers/<Category>/<Trait>.png stacks into final PNGs
 *      (skipped per-item when a layer file is missing, or entirely with
 *      --dry-run — metadata is still produced either way).
 *   3. Scores rarity (statistical rarity: sum of 1/frequency per trait),
 *      ranks all bulls, assigns tiers, and reserves the top
 *      `allowlistPoolSize` ranks (plus the hand-crafted legendary 1/1s)
 *      for the holder-allowlist pool.
 *   4. Writes Metaplex-standard metadata JSON per bull + collection.json,
 *      rarity-report.json and a CSV summary.
 *
 * Usage:
 *   node src/generate.mjs [--config traits.config.json] [--out out]
 *                         [--supply N] [--dry-run]
 *
 * Output layout (ready for Sugar / Umi upload):
 *   out/assets/0.png 0.json 1.png 1.json ... collection.json
 *   out/rarity-report.json  out/rarity.csv
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// ---------- CLI ----------
const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(`--${name}`);
}
function opt(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const CONFIG_PATH = path.resolve(ROOT, opt("config", "traits.config.json"));
const OUT_DIR = path.resolve(ROOT, opt("out", "out"));
const DRY_RUN = flag("dry-run");

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const C = config.collection;
const SUPPLY = Number(opt("supply", C.supply));
const LAYERS_DIR = path.resolve(path.dirname(CONFIG_PATH), "layers");
const LEGENDARIES = config.legendaries ?? [];
const GENERATED_COUNT = SUPPLY - LEGENDARIES.length;

// ---------- seeded RNG (mulberry32) — same seed, same herd ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(C.seed ?? 1);

// ---------- weighted pick ----------
function pickTrait(category) {
  const total = category.traits.reduce((s, t) => s + t.weight, 0);
  let r = rng() * total;
  for (const t of category.traits) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return category.traits[category.traits.length - 1];
}

function violatesExclusion(combo) {
  for (const rule of config.exclusions ?? []) {
    if (!rule.if) continue;
    const ifOk = Object.entries(rule.if).every(([c, t]) => combo[c] === t);
    const notHit = Object.entries(rule.not).some(([c, t]) => combo[c] === t);
    if (ifOk && notHit) return true;
  }
  return false;
}

// ---------- 1. roll unique combos ----------
const seen = new Set();
const bulls = [];
let attempts = 0;
const MAX_ATTEMPTS = GENERATED_COUNT * 500;

while (bulls.length < GENERATED_COUNT && attempts < MAX_ATTEMPTS) {
  attempts++;
  const combo = {};
  for (const cat of config.categories) combo[cat.name] = pickTrait(cat).name;
  if (violatesExclusion(combo)) continue;
  const dna = config.categories.map((c) => combo[c.name]).join("|");
  if (seen.has(dna)) continue;
  seen.add(dna);
  bulls.push({ combo });
}
if (bulls.length < GENERATED_COUNT) {
  console.error(
    `Only ${bulls.length}/${GENERATED_COUNT} unique combos possible — add traits or reduce supply.`,
  );
  process.exit(1);
}

// ---------- 2. statistical rarity ----------
const freq = {}; // category -> trait -> count (among generated bulls)
for (const cat of config.categories) freq[cat.name] = {};
for (const b of bulls) {
  for (const cat of config.categories) {
    const t = b.combo[cat.name];
    freq[cat.name][t] = (freq[cat.name][t] ?? 0) + 1;
  }
}
for (const b of bulls) {
  b.score = config.categories.reduce(
    (s, cat) => s + GENERATED_COUNT / freq[cat.name][b.combo[cat.name]],
    0,
  );
}

// Legendaries are 1/1s: rank above every generated bull by construction.
const ranked = [
  ...LEGENDARIES.map((l) => ({ legendary: true, name: l.name, score: Infinity })),
  ...[...bulls].sort((a, b) => b.score - a.score),
];
ranked.forEach((b, i) => (b.rank = i + 1));

const tierOf = (rank) => {
  if (rank <= LEGENDARIES.length) return "Legendary 1/1";
  if (rank <= C.allowlistPoolSize) return "Mythic";
  if (rank <= Math.floor(SUPPLY * 0.25)) return "Epic";
  if (rank <= Math.floor(SUPPLY * 0.6)) return "Rare";
  return "Common";
};

// ---------- 3. mint order: shuffle so rank ≠ token id ----------
const mintOrder = [...ranked];
for (let i = mintOrder.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [mintOrder[i], mintOrder[j]] = [mintOrder[j], mintOrder[i]];
}
mintOrder.forEach((b, i) => (b.id = i));

// ---------- 4. write metadata (+ images unless dry run) ----------
const ASSETS = path.join(OUT_DIR, "assets");
fs.mkdirSync(ASSETS, { recursive: true });

let sharp = null;
if (!DRY_RUN) {
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("sharp not installed — falling back to metadata-only output.");
  }
}

let composed = 0;
let missingLayers = 0;

for (const b of mintOrder) {
  const tier = tierOf(b.rank);
  const attributes = b.legendary
    ? [
        { trait_type: "Legendary", value: b.name },
        { trait_type: "Rarity Tier", value: tier },
      ]
    : [
        ...config.categories.map((cat) => ({
          trait_type: cat.name,
          value: b.combo[cat.name],
        })),
        { trait_type: "Rarity Tier", value: tier },
      ];

  const meta = {
    name: b.legendary ? `SolBull — ${b.name}` : `SolBull #${b.id}`,
    symbol: C.symbol,
    description: C.description,
    image: `${b.id}.png`,
    external_url: C.externalUrl,
    seller_fee_basis_points: C.sellerFeeBasisPoints,
    attributes,
    properties: {
      files: [{ uri: `${b.id}.png`, type: "image/png" }],
      category: "image",
    },
  };
  fs.writeFileSync(
    path.join(ASSETS, `${b.id}.json`),
    JSON.stringify(meta, null, 2),
  );

  // compose image: legendaries are single hand-crafted files
  if (!sharp) continue;
  if (b.legendary) {
    const file = path.join(LAYERS_DIR, "Legendaries", `${b.name}.png`);
    if (fs.existsSync(file)) {
      await sharp(file)
        .resize(C.size * C.outputScale, C.size * C.outputScale, {
          kernel: "nearest",
        })
        .png()
        .toFile(path.join(ASSETS, `${b.id}.png`));
      composed++;
    } else missingLayers++;
    continue;
  }

  const stack = [];
  let missing = false;
  for (const cat of config.categories) {
    const trait = cat.traits.find((t) => t.name === b.combo[cat.name]);
    if (trait?.none) continue;
    const file = path.join(LAYERS_DIR, cat.name, `${trait.name}.png`);
    if (!fs.existsSync(file)) {
      missing = true;
      break;
    }
    stack.push(file);
  }
  if (missing || stack.length === 0) {
    missingLayers++;
    continue;
  }
  const [base, ...rest] = stack;
  await sharp(base)
    .composite(rest.map((input) => ({ input })))
    .resize(C.size * C.outputScale, C.size * C.outputScale, {
      kernel: "nearest",
    })
    .png()
    .toFile(path.join(ASSETS, `${b.id}.png`));
  composed++;
}

// collection-level metadata (Metaplex collection NFT)
fs.writeFileSync(
  path.join(ASSETS, "collection.json"),
  JSON.stringify(
    {
      name: C.name,
      symbol: C.symbol,
      description: C.description,
      image: "collection.png",
      external_url: C.externalUrl,
      properties: {
        files: [{ uri: "collection.png", type: "image/png" }],
        category: "image",
      },
    },
    null,
    2,
  ),
);

// ---------- 5. rarity report ----------
const report = {
  generatedAt: null, // stamped by CI/release tooling, not here (determinism)
  supply: SUPPLY,
  seed: C.seed,
  allowlistPool: mintOrder
    .filter((b) => b.rank <= C.allowlistPoolSize)
    .map((b) => b.id)
    .sort((a, z) => a - z),
  traitFrequencies: freq,
  bulls: mintOrder
    .map((b) => ({
      id: b.id,
      name: b.legendary ? `SolBull — ${b.name}` : `SolBull #${b.id}`,
      rank: b.rank,
      tier: tierOf(b.rank),
      score: b.legendary ? "1/1" : Number(b.score.toFixed(2)),
      traits: b.legendary ? { Legendary: b.name } : b.combo,
    }))
    .sort((a, z) => a.rank - z.rank),
};
fs.writeFileSync(
  path.join(OUT_DIR, "rarity-report.json"),
  JSON.stringify(report, null, 2),
);

const csv = [
  "id,name,rank,tier,score",
  ...report.bulls.map((b) => `${b.id},"${b.name}",${b.rank},${b.tier},${b.score}`),
].join("\n");
fs.writeFileSync(path.join(OUT_DIR, "rarity.csv"), csv);

// ---------- summary ----------
const tiers = {};
for (const b of report.bulls) tiers[b.tier] = (tiers[b.tier] ?? 0) + 1;
console.log(`SolBull generation complete → ${OUT_DIR}`);
console.log(`  supply:        ${SUPPLY} (${LEGENDARIES.length} legendary 1/1s + ${GENERATED_COUNT} generated)`);
console.log(`  unique combos: ${bulls.length} (${attempts} rolls)`);
console.log(`  tiers:         ${Object.entries(tiers).map(([t, n]) => `${t}: ${n}`).join(", ")}`);
console.log(`  allowlist:     top ${C.allowlistPoolSize} ranks → ${report.allowlistPool.length} token ids (out/rarity-report.json)`);
console.log(
  sharp
    ? `  images:        ${composed} composed, ${missingLayers} skipped (missing layer files)`
    : `  images:        skipped (${DRY_RUN ? "--dry-run" : "sharp unavailable"})`,
);
