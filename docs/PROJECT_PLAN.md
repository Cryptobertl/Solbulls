# SolBulls — Website & Burn-to-Mint NFT Collection: Proposal & Project Plan

**Status:** Draft v1 · **Date:** 2026-07-04 · **Owner:** SolBulls team · **Hosting:** TBD (see §8)

---

## 1. Executive summary

SolBulls has three assets today that live in separate places:

1. **Heritage & brand.** *SolBulls Gang* has been listed in the official
   [Solana ecosystem directory](https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md)
   since **2021-10-10** — "a gang of bulls living on #Solana. Breed and merge them to make yours
   more powerful, then earn money in our play2earn game." The original ecosystem featured bull
   NFTs, staking that produced DNA tokens, breeding/merging, and mining rewards.
2. **A live token.** **$SOLBULLS** trades on Solana
   ([DexScreener pair `H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ`](https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq)).
3. **A landing page.** [solbulls.xyz](https://solbulls.xyz/) — the current public face of the
   token.

This plan proposes **one full-fledged website** that absorbs the current solbulls.xyz content,
revives the SolBulls Gang brand, and adds the flagship utility: **the SolBull NFT collection,
minted exclusively by burning $SOLBULLS**. Every NFT minted permanently reduces token supply,
creating a deflationary loop that ties the token and the collection together.

The plan is phased so something shippable goes live early (a polished marketing site), with the
on-chain mint following after devnet testing.

---

## 2. Background & existing assets

| Asset | Where | Notes |
|---|---|---|
| Brand logo | [`img/solbulls.png`](https://github.com/solana-labs/ecosystem/blob/9e525b60b623b99dab6e204947212515ab80f158/img/solbulls.png) (copied to `assets/img/solbulls.png`) | White bull on a pink→purple→cyan→mint vaporwave gradient. This gradient becomes the design-system anchor (§5). |
| Ecosystem listing | [`projects/solbulls.md`](https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md) | Name "SolBulls Gang", category NFT, status Live, links to solbulls.art, Twitter [@SolanaBullsNFT](https://twitter.com/SolanaBullsNFT), [Discord](https://discord.com/invite/Quf39wHSjg). |
| Heritage mechanics | solbulls.art (original dApp) | Bull staking → DNA tokens → breeding/merging; mining with chest rewards (~every 14 days). Not required for launch, but valuable lore + a Phase 5 candidate. |
| Token | [DexScreener](https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq) | $SOLBULLS / SOL pair. ⚠️ The **token mint address, total supply, decimals, and authority status** (mint/freeze revoked?) must be read from the pair on-chain and pinned in this repo before any burn logic is written — see §11. |
| Current site | [solbulls.xyz](https://solbulls.xyz/) | Content to be inventoried and migrated into the new site (copy, memes, CA, buy links, socials). |

---

## 3. Goals & success metrics

**Goals**

- G1 — Single canonical website: brand, token info, buy links, socials, and NFT mint in one place.
- G2 — Give $SOLBULLS real utility via burn-to-mint; make total-burned a public, growing number.
- G3 — Zero-custody, trust-minimized mint (users sign one transaction; no backend holds funds).
- G4 — A site fast and polished enough to be shared as the first impression of the project.

**Success metrics**

- Website live on the production domain (solbulls.xyz or successor) with >90 Lighthouse scores.
- Burn-to-mint live on mainnet; ≥ X% of supply burned in the first 90 days (X set at launch).
- Sell-out or steady mint pace of the initial SolBull collection.
- One canonical link used across Twitter/X, Telegram, Discord, and DexScreener listing.

---

## 4. Website proposal

### 4.1 Sitemap

```
/                     Home — hero (bull + gradient), one-liner, CA copy button, buy links,
│                     live price ticker, "Mint a SolBull" CTA, socials
├── /token            $SOLBULLS dashboard — price, liquidity, mcap, holders, chart embed,
│                     total burned counter, how-to-buy (Jupiter/Raydium links)
├── /mint             Burn-to-mint dApp — connect wallet, shows $SOLBULLS balance,
│                     burn amount, remaining supply, mint button, reveal
├── /collection       SolBull gallery — minted NFTs, traits & rarity explorer,
│                     links to Magic Eden / Tensor
├── /roadmap          Phased roadmap (this plan, public version)
├── /lore             Heritage page — SolBulls Gang story since 2021, old mechanics,
│                     ecosystem-listing provenance (credibility signal)
├── /faq              Token + mint FAQ, disclaimers, contract addresses
└── (footer)          Terms/disclaimer, brand kit download, GitHub link
```

### 4.2 Key pages in detail

**Home** — everything a first-time visitor needs above the fold: what SolBulls is, the contract
address with a copy button, a Buy button (Jupiter swap link or embedded Jupiter Terminal widget),
and the Mint CTA. Below: live stats strip (price / mcap / liquidity / **tokens burned**),
collection preview, roadmap teaser, community links.

**/token** — data pulled client-side from the free
[DexScreener API](https://docs.dexscreener.com/) (`/latest/dex/pairs/solana/<pair>`), refreshed
~every 60 s, plus an embedded DexScreener chart iframe. On-chain data (supply, burned amount)
from RPC. Includes a prominent "how to buy" section for newcomers.

**/mint** — the centerpiece. **Phantom is the primary, first-class wallet** (see §4.3); other
wallets are supported through the same adapter. Flow:

1. Connect wallet — Phantom shown first in the connect modal; auto-detected when the site runs
   inside Phantom's in-app browser (mobile) or when the extension is installed (desktop).
2. UI shows: user's $SOLBULLS balance, burn price per NFT, NFTs remaining, total burned so far.
3. User clicks **Burn & Mint** → signs a single transaction that (a) burns the required
   $SOLBULLS from their token account and (b) mints one SolBull NFT to their wallet.
4. Reveal animation; NFT appears with traits; share-to-X button.

Edge cases handled in UI: insufficient balance (deep-link to Jupiter to buy the difference),
sold out, wallet on wrong network, RPC congestion (retry with priority fees).

**/collection** — reads the collection via DAS API (Helius) and renders a paginated gallery with
trait filters and a simple rarity score. Links each NFT to Magic Eden/Tensor.

### 4.3 Phantom-first minting (hard requirement)

Minting must work **inside Phantom via wallet connection** on every surface Phantom offers.
Concretely, the burn+mint transaction is always built client-side and sent to the connected
Phantom wallet for signing — no other signing path exists. The three Phantom surfaces:

| Surface | How it works | What we must do |
|---|---|---|
| **Desktop — Phantom browser extension** | Standard `window.phantom.solana` provider via Solana Wallet Standard; Wallet Adapter picks it up automatically. | Phantom listed first in the connect modal; "detected" badge; one-click connect → burn+mint tx → Phantom approval popup shows the token burn and NFT mint clearly. |
| **Mobile — Phantom in-app dApp browser** | User opens solbulls.xyz *inside* Phantom (Browser tab). The provider is injected exactly like the extension. | The site must be fully responsive and the mint flow completable end-to-end in this webview. Auto-connect prompt on /mint when the injected provider is present. This is the **primary mobile path** — most memecoin traffic is mobile Phantom users. |
| **Mobile — external browser (Safari/Chrome)** | No injected provider. Use **Phantom deeplinks / universal links** (`https://phantom.app/ul/browse/<url>`) to bounce the user into Phantom's in-app browser, landing directly on /mint. | "Open in Phantom" button replaces "Connect" when we detect mobile + no provider. Android additionally gets Mobile Wallet Adapter (MWA) support, which Wallet Adapter provides out of the box. |

Additional Phantom-specific work:

- **Transaction preview quality:** Phantom simulates transactions and shows "you send / you
  receive". We test that the approval screen shows *−N $SOLBULLS (burn)* and *+1 SolBull NFT* —
  using the standard SPL burn instruction + Core Candy Machine mint keeps Phantom's simulation
  legible. Anything that renders as a red "unknown interaction" warning is treated as a launch
  blocker.
- **Versioned transactions + priority fees** so mints confirm under congestion (Phantom supports
  v0 transactions).
- **Token & NFT visibility:** ensure $SOLBULLS token metadata and the collection's Core metadata
  render correctly in Phantom's wallet UI (icon, name), and the minted SolBull appears in the
  Collectibles tab immediately after confirmation.
- **QA matrix (gate for Phase 4):** Phantom extension (Chrome/Brave/Firefox), Phantom iOS
  in-app browser, Phantom Android in-app browser, Safari-iOS → deeplink handoff, Chrome-Android →
  MWA/deeplink handoff. All five must complete a devnet burn+mint before mainnet.
- **Optional (Phase 5):** publish the mint as a **Solana Action/Blink**, which Phantom can render
  natively — minting from a link on X without visiting the site at all.

### 4.4 Design system

Derived from the existing logo (white bull, vaporwave gradient):

- **Palette:** hot pink `#FF6EC7` → purple `#B26EFF` → cyan `#3EC6FF` → mint `#4DFFB8` gradient
  accents on a near-black background (`#0B0B12`); white/off-white text. (Exact stops to be
  sampled from `assets/img/solbulls.png` during Phase 0.)
- **Typography:** a bold display face for headlines (e.g., Clash Display / Space Grotesk) + Inter
  for body. Slight retro/vaporwave flavor to match the logo, kept legible.
- **Motif:** the bull. Hero uses a large upscaled/redrawn bull; section dividers use horn shapes;
  the mint button gets the gradient treatment.
- **Tone:** confident, meme-aware, but clean — credible enough for the /lore provenance story.
- Dark theme only at launch (crypto-native default); light theme optional later.

### 4.5 Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Static marketing pages + dynamic dApp routes in one codebase; best hosting portability. |
| Styling | Tailwind CSS + shadcn/ui | Fast iteration, consistent components. |
| Wallets | `@solana/wallet-adapter` (Phantom-first) + Phantom deeplinks + Mobile Wallet Adapter | Phantom extension & in-app browser work via the injected provider; deeplinks/MWA cover mobile external browsers (§4.3). Other major wallets supported by the same adapter. |
| Solana SDK | `@solana/web3.js` + Metaplex **Umi** | Umi is the current Metaplex client for Core/Candy Machine. |
| Market data | DexScreener public API | Free, no key, already the canonical chart link. |
| On-chain reads | Helius RPC + DAS API | Reliable mainnet RPC; DAS powers the gallery. |
| Analytics | Plausible or Umami | Privacy-friendly, no cookie banner. |
| CI | GitHub Actions | Lint, typecheck, build, preview deploys. |

No backend/database is required for launch: the site is static + client-side chain reads. If a
mint allowlist or burn-leaderboard is wanted later, a thin serverless layer (Vercel functions or
Cloudflare Workers) can be added without re-architecting.

---

## 5. SolBull NFT collection — burn-to-mint design

### 5.1 Concept

> **Burn $SOLBULLS → mint a SolBull.** The only way to obtain a SolBull NFT at primary is to
> destroy tokens. Supply of the token shrinks with every mint; the NFT's floor has an implicit
> cost basis in burned tokens.

### 5.2 Collection parameters (✅ ratified by owner, 2026-07-04)

| Parameter | Decision | Rationale |
|---|---|---|
| Collection size | **Series 1: 999 SolBulls**, expandable in later series up to a hard max of **2,222** (Series 2+ at a higher burn price - new candy machine, same collection) | Owner decision 2026-07-04; keeps Series 1 scarce while leaving room for the herd to grow. |
| Burn price | Fixed amount of $SOLBULLS per mint, **targeting ~0.05 SOL equivalent** (Series 1; later series mint at a higher price) at launch pricing | Set once at launch from a 7-day TWAP; a fixed token amount (not USD-pegged) keeps the mechanic simple and fully on-chain. |
| Per-wallet limit | **10** (guard-enforced) | Anti-bot, wider distribution. |
| Allowlist phase | **Yes** — $SOLBULLS holders pre-mint the pool containing the **100 rarest bulls** (incl. the legendary 1/1s); snapshot criteria announced in the X community pre-launch | Rewards holders; implemented as a separate Candy Machine guard group (`allowList` Merkle root) over a reserved item range. |
| Royalties | 5%, enforced via Metaplex Core royalty plugin | Funds ongoing development. |
| Standard | **Metaplex Core** assets | Cheapest mint cost for users, modern standard, plugin support (royalties, freeze, attributes). |
| Metadata & art storage | Arweave via **Irys** | Permanent, one-time cost, industry default. |
| Art direction | **64×64 layer-based pixel art** per the *Bull Society Master Guide* (`assets/img/bull-society-master-guide.jpeg`): bodies 15+, horns 20+, eyes 35+, mouths 20+, hats 35+, clothes 30+, chains 15+, backgrounds 30+; trait stacking order defined; **10 hand-crafted legendary 1/1s** (Samurai, Pharaoh, Cyber, King, Demon, Astronaut, Wall Street, Pirate, Alien, God Bull) | Owner-provided guide; honors the original logo (the white bull is the base head). |
| Reveal | Instant reveal (no delayed reveal) | Simpler, no reveal-trust issues; randomness via Candy Machine's built-in item shuffling (`hiddenSettings` not needed). |

### 5.3 Implementation options for burn-to-mint

**Option A — Metaplex Core Candy Machine + `token burn` guard (recommended).**
Candy Machine v3 / Core Candy Machine ships a first-party **`tokenBurn` guard**: the mint
transaction requires the payer to burn a configured amount of a given SPL mint. This is exactly
our mechanic, with **no custom program to write or audit**.

- Guards to enable: `tokenBurn` ($SOLBULLS amount), `mintLimit` (10/wallet), `botTax`
  (small SOL penalty for invalid mints), `startDate`, optionally `allowList` (Merkle root) for an
  OG/holder pre-phase.
- Effort: configuration + art pipeline only. Battle-tested by hundreds of collections.
- Constraint: burn amount is fixed per guard group (can differ between allowlist/public groups —
  e.g., cheaper burn for OG holders).

**Option B — custom Anchor program.**
Needed only if we want dynamic pricing (e.g., bonding-curve burn price), burning into a
"furnace" stats PDA, or burn-for-upgrade mechanics later. Costs: development + **security
audit** + more launch risk.

**Decision: ship Option A for launch.** Revisit B in Phase 5 if breeding/upgrade mechanics
return (a burn-to-upgrade program would echo the original DNA/merge lore).

### 5.4 Deflationary flywheel & transparency

- Fully-minted collection burns `999 × burn-price` (Series 1) tokens — publish this number pre-launch.
- The site's **"Total $SOLBULLS burned"** counter reads burn events on-chain (token supply delta
  of the mint) — verifiable by anyone, not a number we assert.
- Post-launch: royalties (or a % of any team funds) can fund periodic buy-and-burn, feeding the
  same counter.

### 5.5 Art & metadata pipeline (`packages/nft`) — ✅ implemented

The generator is built and tested (see [`packages/nft/README.md`](../packages/nft/README.md)):

1. **Trait layers** — 64×64 transparent PNGs dropped into `layers/<Category>/<Trait>.png`,
   matching `traits.config.json` (categories mirror the Bull Society guide: Background, Aura,
   Body, Horns, Eyes, Mouth, Clothes, Chain, Hat + `layers/Legendaries/` for the ten 1/1s).
   **This is the remaining manual step** — producing the real art files from the guide.
2. **Weighted roll** — seeded RNG picks traits by configured weights (Common→Legendary spread),
   rejects duplicate DNA and excluded combos. Same seed ⇒ same herd: reproducible and
   community-auditable. Verified: 878 unique bulls roll cleanly from the starting config.
3. **Rarity model** — statistical rarity score `Σ (supply / trait_count)` per bull
   (rarity.tools formula), global ranking, tiers: ranks 1–10 *Legendary 1/1*, 11–100 *Mythic*,
   top 25 % *Epic*, top 60 % *Rare*, rest *Common*. `Rarity Tier` is written into each NFT's
   on-chain attributes so it shows in Phantom/marketplaces.
4. **Allowlist pool** — the top 100 ranks (10 legendaries + 90 rarest generated) are exported
   as token ids in `out/rarity-report.json`; Phase 3 loads exactly these items into the
   allowlist guard group.
5. **Anti-snipe shuffle** — mint order is seed-shuffled so token id ≠ rarity rank.
6. **Output** — `out/assets/0.png 0.json … collection.json` in Sugar/Umi upload format
   (Metaplex metadata standard, 2048×2048 nearest-neighbor upscale), plus `rarity-report.json`
   and `rarity.csv`. Then: `sugar upload` → Arweave (Irys) → Candy Machine; addresses recorded
   in `docs/DEPLOYMENTS.md`; full devnet dry-run with a mock $SOLBULLS mint before mainnet.

---

## 6. Architecture

```
┌────────────────────────────  Browser  ────────────────────────────┐
│  Next.js app (static + client components)                         │
│  ├── Wallet Adapter ── signs burn+mint tx ──► Solana mainnet      │
│  │                                            ├─ SPL Token: burn  │
│  │                                            └─ Core Candy       │
│  │                                               Machine + guards │
│  ├── DexScreener API ◄── price/liquidity/mcap (60s polling)       │
│  └── Helius RPC/DAS ◄── supply, burned total, collection gallery  │
└───────────────────────────────────────────────────────────────────┘
        ▲
        │  static deploy (CI on push to main)
   Hosting (TBD, §8) — no server-side secrets; RPC key domain-restricted
```

Security properties: no backend custody, no private keys in the repo or CI, mint authority kept
on a hardware wallet, Candy Machine authority optionally moved to a multisig (Squads) before
public mint.

---

## 7. Phases, deliverables & timeline

Estimates assume ~1 developer + 1 artist part-time; calendar time, not effort.

### Phase 0 — Discovery & foundations (Week 1)
- Inventory solbulls.xyz content; collect all official links, CA, memes, copy.
- **Verify token facts on-chain** (mint address from the DexScreener pair, supply, decimals,
  mint/freeze authority status) and pin them in `docs/TOKEN.md`.
- Sample exact brand colors from the logo; assemble mini brand kit (`assets/`).
- Decide hosting (§8) and domain strategy (keep solbulls.xyz as primary).
- **Deliverable:** `docs/TOKEN.md`, brand kit, hosting decision, content doc.

### Phase 1 — Marketing website MVP (Weeks 2–3)
- Scaffold `apps/web` (Next.js + Tailwind + CI + preview deploys).
- Build Home, /roadmap, /lore, /faq with final design system.
- Launch on production domain; set up analytics and OG/social cards.
- **Deliverable:** new solbulls.xyz live (replaces current landing page).

### Phase 2 — Token dashboard (Week 4)
- /token page: DexScreener API integration, chart embed, how-to-buy, CA copy, Jupiter link.
- Live burned-supply counter (reads token supply vs. initial supply).
- **Deliverable:** /token live; site becomes the canonical link on socials + DexScreener.

### Phase 3 — Collection & devnet mint (Weeks 5–8)
- Art: trait design → generation → community preview of sample bulls.
- Upload assets to Arweave (Irys); create Core Candy Machine + guards on **devnet** with a mock
  token; build /mint and /collection pages against devnet.
- Community test mint; fix UX; agree final burn price & schedule via community vote.
- Run the full **Phantom QA matrix** (§4.3): extension, iOS/Android in-app browser, mobile
  deeplink handoff — all five surfaces must complete a devnet burn+mint.
- **Deliverable:** working end-to-end burn-to-mint on devnet, verified inside Phantom on desktop
  and mobile; published mint terms.

### Phase 4 — Mainnet launch (Week 9)
- Deploy Candy Machine to mainnet; authorities to hardware wallet/multisig; verify collection.
- Optional OG allowlist phase (24 h) → public phase.
- Launch comms: X thread, Discord/Telegram events, DexScreener/Birdeye profile updates.
- **Deliverable:** SolBull mint live; burned counter climbing.

### Phase 5 — Post-launch (Weeks 10+)
- Rarity explorer polish, holder verification (Discord roles via Matrica or similar).
- Buy-and-burn from royalties; leaderboard of top burners.
- Explore heritage revival: staking, burn-to-merge/upgrade (custom program, audited — Option B),
  echoing the original DNA/breeding mechanics.
- **Deliverable:** roadmap v2 shaped with the community.

---

## 8. Hosting options (decision TBD — Phase 0)

| Option | Cost | Pros | Cons | Fit |
|---|---|---|---|---|
| **Vercel** (recommended) | Free tier → ~$20/mo | First-class Next.js, preview deploys per PR, edge network, easy env vars | Vendor lock-in mild | ✅ Best DX for this stack |
| Cloudflare Pages | Free tier generous | Fast edge, Workers if a thin API is needed later, great DDoS posture | Next.js support via adapter, slightly more setup | ✅ Strong alternative |
| Netlify | Free tier | Simple, mature | Weaker Next.js App Router story than Vercel | OK |
| GitHub Pages | Free | Zero cost, same org as repo | Static-only export; no image optimization, no preview envs, awkward for the dApp routes | Only for a temporary landing |
| Fleek / IPFS + Arweave mirror | ~Free | Decentralized, censorship-resistant — on-brand for crypto | Slower iteration; DNS quirks | Nice as a **mirror** of the mint page, not primary |

**✅ Decision (2026-07-04): Vercel** — the owner has an account; connect this GitHub repo with
root directory `apps/web`. An IPFS mirror of the /mint page can be added once the mint is live
(common practice so the mint survives any hosting/domain issue).

---

## 9. Cost estimate (order of magnitude)

| Item | Est. |
|---|---|
| Art (traits + 1/1s, commissioned) | $500–2,500 depending on artist |
| Arweave storage via Irys (999 images + JSON) | ~$20–80 |
| Candy Machine deploy + rent | < 2 SOL |
| Helius RPC (developer plan) | $0–49/mo |
| Hosting | $0–20/mo |
| Domain renewals | ~$15/yr |
| Custom program audit (only if Option B later) | $5k+ — avoided at launch by Option A |

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong token targeted by burn guard | Phase 0 on-chain verification of the mint address; address pinned in repo and cross-checked in CI against the frontend constant. |
| Mint bots / snipers | `botTax` + `mintLimit` guards; optional allowlist phase. |
| Token price volatility vs. fixed burn price | Set price from 7-day TWAP shortly before launch; guards allow updating the burn amount if the community votes to re-price. |
| Fake sites / scam clones during mint | Publish the only official URL everywhere in advance; show the Candy Machine address on-site; register lookalike domains if cheap. |
| Metadata impermanence | Arweave (permanent) rather than centralized storage. |
| Authority compromise | Hardware wallet + Squads multisig for CM/collection authority; no keys in CI. |
| Regulatory/optics | Clear disclaimers (no financial advice, NFTs are collectibles, burns irreversible); no yield promises in copy. |
| Heritage-brand confusion (solbulls.art vs .xyz) | /lore page tells the story explicitly; coordinate with original community channels where possible. |

---

## 11. Open questions (need answers before/during Phase 0)

1. ~~**Token mint address**~~ ✅ Provided by owner: `6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`
   — pinned in [`docs/TOKEN.md`](TOKEN.md) with a remaining on-chain verification checklist
   (supply/decimals/authorities + pair cross-check).
2. Who controls the **solbulls.xyz domain** and current site — DNS access needed for cutover
   (owner has a Vercel account; domain must be pointed at the Vercel project).
3. Relationship to the original **SolBulls Gang** team/community (solbulls.art, @SolanaBullsNFT,
   Discord) — collaboration, blessing, or clean-break lore? Official community hub is now the
   [X community](https://x.com/i/communities/2027457477978272111).
4. ~~Collection size and burn price~~ ✅ Series 1: 999 bulls (max 2,222 across series); burn ≈ 0.05 SOL worth of $SOLBULLS per mint
   (exact token amount fixed from 7-day TWAP at launch). Matches the art guide's "888 NFTs".
5. ~~Artist / style~~ ✅ 64×64 pixel art per the owner-provided *Bull Society Master Guide*;
   trait layers still need to be produced as individual PNG files from the guide.
6. **Allowlist snapshot criteria** — ✅ holders-only phase for the 100 rarest bulls is decided;
   still open: minimum $SOLBULLS balance and snapshot date.
7. ~~Hosting~~ ✅ Vercel (owner's account), root directory `apps/web`.
8. Multisig signers for mint authority.

---

## 12. References

- Ecosystem listing: <https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md>
- Brand logo: <https://github.com/solana-labs/ecosystem/blob/9e525b60b623b99dab6e204947212515ab80f158/img/solbulls.png>
- Current site: <https://solbulls.xyz/>
- Token pair: <https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq>
- Metaplex Core Candy Machine & guards (incl. `tokenBurn`): <https://developers.metaplex.com/core-candy-machine>
- DexScreener API: <https://docs.dexscreener.com/>
- Irys (Arweave uploads): <https://docs.irys.xyz/>
- Solana Wallet Adapter: <https://github.com/anza-xyz/wallet-adapter>
