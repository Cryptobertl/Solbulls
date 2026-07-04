<p align="center">
  <img src="assets/img/solbulls.png" alt="SolBulls logo" width="120" />
</p>

<h1 align="center">SolBulls 🐂</h1>

<p align="center">
  <strong>The gang of bulls living on Solana — website, $SOLBULLS token hub, and the burn-to-mint SolBull NFT collection.</strong>
</p>

<p align="center">
  <a href="https://solbulls.xyz/">Website</a> ·
  <a href="https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq">$SOLBULLS on DexScreener</a> ·
  <a href="https://twitter.com/SolanaBullsNFT">Twitter/X</a> ·
  <a href="https://discord.com/invite/Quf39wHSjg">Discord</a>
</p>

---

## What is this repository?

This repo is the home of the **new full-fledged SolBulls website** and the tooling around the
**SolBull NFT collection**, which will be minted by **burning $SOLBULLS** tokens (live on Solana).

It currently contains the project proposal and plan; the application code will land here as the
phases in the plan are executed.

📄 **Start here → [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)** — the full website proposal,
burn-to-mint NFT design, architecture, roadmap, and hosting options.

## The idea in 30 seconds

1. **One website, one brand.** Replace/absorb the current landing page at
   [solbulls.xyz](https://solbulls.xyz/) with a modern, fast, wallet-connected web app that unites
   the SolBulls heritage (the original *SolBulls Gang* NFT project, listed in the
   [Solana ecosystem](https://github.com/solana-labs/ecosystem/blob/d71e170ea5250426ed51500411ea3ceb3dfff015/projects/solbulls.md)
   since October 2021) with the live **$SOLBULLS** token.
2. **Burn-to-mint NFTs.** Holders connect Phantom and burn a fixed amount of $SOLBULLS to mint
   a SolBull NFT — one signed transaction, working in the Phantom extension and inside Phantom's
   mobile in-app browser. Every mint permanently removes tokens from circulation — a deflationary
   flywheel that gives the token real utility and the collection a real cost basis.
3. **Live token hub.** The site shows live price, liquidity, market cap and burn statistics
   (DexScreener API + on-chain data), so the community has one canonical place to point to.

## Planned repository structure

```
Solbulls/
├── README.md               ← you are here
├── docs/
│   └── PROJECT_PLAN.md     ← full proposal & project plan
├── assets/
│   └── img/                ← brand assets (logo, art, og-images)
├── apps/
│   └── web/                ← Next.js website + mint dApp   (Phase 1+)
├── packages/
│   └── nft/                ← collection config, art/metadata pipeline (Phase 3+)
└── programs/               ← only if a custom on-chain program is needed (see plan)
```

## Tech stack (proposed)

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Wallets | **Phantom-first** (extension, in-app browser, deeplinks) via Solana Wallet Adapter; Solflare, Backpack… also supported |
| NFT / mint | Metaplex Core + Candy Machine with **token-burn guard** |
| Metadata storage | Arweave via Irys (permanent) |
| Market data | DexScreener public API |
| RPC | Helius (or Triton/QuickNode) |
| Hosting | **TBD** — Vercel recommended; see plan §8 |

## Status

- [x] Proposal & project plan written
- [ ] Phase 0 — brand & content inventory, token facts verified on-chain
- [ ] Phase 1 — marketing website MVP live
- [ ] Phase 2 — live $SOLBULLS token dashboard
- [ ] Phase 3 — SolBull collection art + burn-to-mint on devnet
- [ ] Phase 4 — mainnet mint launch
- [ ] Phase 5 — post-launch (gallery, staking, heritage game features)

## Token

| | |
|---|---|
| Ticker | **$SOLBULLS** |
| Chain | Solana |
| DexScreener pair | [`H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ`](https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq) |
| Token mint address | ⚠️ to be verified on-chain and pinned here (see plan §11) |

## Disclaimer

$SOLBULLS is a community meme token. Nothing in this repository is financial advice. NFTs minted
by burning tokens are collectibles; burns are irreversible. Always verify contract addresses from
official channels before interacting.
