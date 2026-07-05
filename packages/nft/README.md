# @solbulls/nft — collection generator

Turns the **Bull Society Master Guide** trait layers into the SolBull collection (Series 1: 999 of a 2,222 max):
composed images, Metaplex metadata, rarity ranking, and the holder-allowlist pool.

## How rarity works

1. **Weights** — every trait in [`traits.config.json`](traits.config.json) has a relative
   `weight` within its category. Higher weight = more common. The weights encode the intended
   tiers (Common / Rare / Epic / Legendary trait labels are cosmetic; the numbers do the work).
2. **Roll** — a seeded RNG (`collection.seed`) picks one trait per category for each of the 989
   generated bulls, rejecting duplicates (DNA uniqueness) and combos that hit an exclusion rule.
   Same seed ⇒ identical herd, so the generation is reproducible and auditable by anyone.
3. **Score** — after the roll, each bull gets a *statistical rarity* score:
   `score = Σ (supply / count_of_my_trait)` across categories — the standard
   rarity.tools-style formula. Rarer traits ⇒ bigger score.
4. **Rank & tiers** — all bulls are ranked by score. The 10 hand-crafted **legendary 1/1s**
   (Samurai, Pharaoh, Cyber, King, Demon, Astronaut, Wall Street, Pirate, Alien, God Bull) sit
   above every generated bull. Tiers: ranks 1–10 `Legendary 1/1`, 11–100 `Mythic`,
   top 25 % `Epic`, top 60 % `Rare`, rest `Common`.
5. **Allowlist pool** — the top **100 ranks** (legendaries + 90 rarest generated bulls) are the
   holder-allowlist pool. Their token ids are listed in `out/rarity-report.json` →
   `allowlistPool`, which Phase 3 uses to load those items into the allowlist guard group of
   the Candy Machine.
6. **Shuffle** — mint order is shuffled (same seed) so token id ≠ rarity rank; nobody can
   snipe rare ids by minting at a specific moment.

## Workflow

```bash
npm install

# 1. Drop the real 64×64 trait PNGs (transparent) into:
#    layers/<Category>/<Trait name>.png     e.g. layers/Hat/Crown.png
#    layers/Legendaries/<Name>.png          e.g. layers/Legendaries/God Bull.png
#    Categories & names must match traits.config.json exactly.

# 2. Generate everything (images + metadata + rarity report):
npm run generate

# Metadata + rarity only (no images needed yet — great for balancing weights):
npm run generate:dry

# End-to-end pipeline test with placeholder art (no real layers required):
npm run test:fixture
```

Output in `out/assets/` is in **Sugar / Umi upload format** (`0.png 0.json … collection.json`),
ready for `sugar upload` → Arweave (Irys) → Candy Machine creation in Phase 3.

## Balancing rarity

Run `npm run generate:dry` and read `out/rarity-report.json` / `out/rarity.csv`:
`traitFrequencies` shows how often each trait actually landed. Tweak weights in
`traits.config.json`, re-run, repeat until the distribution feels right — it costs nothing
until images are composed. **Freeze the seed + config before launch** and commit them; that
makes the whole collection independently verifiable.

## Notes

- `"none": true` traits (no hat, no chain…) need no layer file.
- `exclusions` prevents visually clashing combos; extend it as art lands.
- Trait counts in the config are a starting spread mirroring the master guide's categories
  (bodies, horns, eyes, mouths, hats, clothes, chains, backgrounds, auras). Rename/extend
  freely — the generator is fully config-driven.
- The composer upscales 100×100 → 2000×2000 with nearest-neighbor (`outputScale: 20`), keeping
  pixels crisp for marketplaces.
