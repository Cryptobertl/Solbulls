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
  <a href="https://x.com/i/communities/2027457477978272111">X Community</a> ·
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

## Getting started

```bash
cd apps/web
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

**Deploy to Vercel:** import this GitHub repo in Vercel, set the project's *Root Directory* to
`apps/web`, framework preset Next.js — no env vars needed for the site itself. Optional env
vars once the mint goes live: `NEXT_PUBLIC_CANDY_MACHINE`, `NEXT_PUBLIC_CLUSTER`,
`NEXT_PUBLIC_RPC_URL`.

## Status

- [x] Proposal & project plan written
- [x] Phase 0 — token CA pinned ([docs/TOKEN.md](docs/TOKEN.md)); parameters ratified
      (2,222 bulls · burn ≈ 0.1 SOL worth per mint · max 10/wallet · holder allowlist for the
      100 rarest · pixel art per the [Bull Society master guide](assets/img/bull-society-master-guide.jpeg) · Vercel hosting)
- [x] Phase 1 — website built in `apps/web` (Home, Token, Mint, Collection, Roadmap, Lore, FAQ;
      Phantom-first wallet connect; DexScreener live stats) — ready to deploy
- [ ] Phase 2 — production domain cutover (solbulls.xyz → Vercel), on-chain burn counter
- [ ] Phase 3 — trait layers produced + burn-to-mint Candy Machine on devnet (Phantom QA matrix)
- [ ] Phase 4 — mainnet mint launch (allowlist → public)
- [ ] Phase 5 — post-launch (gallery, staking, heritage game features)

## Token

| | |
|---|---|
| Ticker | **$SOLBULLS** |
| Chain | Solana |
| Token mint (CA) | [`6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`](https://solscan.io/token/6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump) |
| DexScreener pair | [`H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ`](https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq) |
| Details & verification | [docs/TOKEN.md](docs/TOKEN.md) |

## Disclaimer

$SOLBULLS is a community meme token. Nothing in this repository is financial advice. NFTs minted
by burning tokens are collectibles; burns are irreversible. Always verify contract addresses from
official channels before interacting.
