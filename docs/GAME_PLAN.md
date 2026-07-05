# SolBulls Runner — Play-to-Earn Endless Runner + Reward Pipeline

## Context

**Hosting:** stays on the current **Vercel deployment** (`solbulls.vercel.app`) for now; a paid
custom domain can be pointed at it later — the plan assumes no domain dependency, everything works
on the Vercel URL.

The owner wants a **mobile-first browser game** on the SolBulls site: a Subway-Surfers-style
endless runner where a pixel **SolBull is chased by a Bear**, the player collects **$SOLBULLS
coins** and dodges obstacles. Real value flows back to players: the token accrues **pump.fun
creator fees (in SOL)** to a CTO wallet; those fees are claimed, **auto-swapped to $SOLBULLS**,
and **distributed to players** who log in with Phantom. A **leaderboard** shows top earners.

**Feasibility: yes, every piece is possible.** Confirmed by research:
- pump.fun creator fees are claimable programmatically (`collectCoinCreatorFeeInstructions`
  in the pump SDK, or PumpPortal API).
- Server-side SOL→$SOLBULLS swap via Jupiter Swap API.
- SPL token transfers to player wallets.
- Phantom login via Sign-In With Solana (`signMessage`), verified server-side.

**The catch that shapes the whole design:** the current site is **100% static / client-only**
(confirmed — no `app/api`, no DB, no server anywhere). You cannot pay real value from a score the
browser reports, because scores can be forged. This feature therefore **requires a new
server-authoritative backend**: SIWS auth, server-validated runs (anti-cheat), a database, a
custodial reward wallet, and scheduled jobs. This is the largest and most security-sensitive part
of the entire project.

**Owner decisions (locked):**
- **Reward model: weekly leaderboard prize pool.** Players earn off-chain points every run; each
  week the reward pot = whatever creator fees were claimed that week (bounded, un-farmable),
  swapped to $SOLBULLS and split among the top players. (Chosen over instant per-play payout,
  which is a bot magnet with unbounded cost.)
- **Build order: everything together** — game + backend + auth + leaderboard + fee→buy→payout
  pipeline as one coordinated release (structured below as parallel workstreams with internal
  milestones so it stays buildable and testable on devnet first).

---

## Architecture

```
 ┌────────────── Browser (mobile-first) ──────────────┐
 │  /game   Canvas endless runner (client component)  │
 │    · server-seeded obstacle/coin stream            │
 │    · records input log, submits run for scoring    │
 │  /leaderboard   weekly ranks + $ earned + tx links │
 │  Phantom (wallet-adapter) → SIWS signMessage login │
 └───────────────┬────────────────────────────────────┘
                 │ HTTPS (JWT session cookie)
 ┌───────────────▼──────── Next.js API routes (Vercel) ┐
 │  /api/auth/nonce · /api/auth/verify (SIWS)          │
 │  /api/run/start  → runId + server seed (HMAC token) │
 │  /api/run/submit → re-simulate & validate → points  │
 │  /api/leaderboard · /api/me                         │
 │  /api/cron/* (protected by CRON_SECRET)             │
 └───────┬──────────────────────────┬──────────────────┘
         │                          │
 ┌───────▼────────┐        ┌────────▼──────────── Solana ┐
 │ Postgres (Neon │        │ Reward/treasury hot wallet   │
 │ or Supabase)   │        │  1. claim pump creator fees  │
 │ players, runs, │        │     → SOL                    │
 │ competitions,  │        │  2. Jupiter swap SOL→$SOLBULLS│
 │ payouts,       │        │  3. SPL transfer to top-N    │
 │ treasury_ops   │        │ (keys in env/KMS, NOT repo)  │
 └────────────────┘        └──────────────────────────────┘
   Weekly cron: close competition → claim → buy → distribute (idempotent)
```

**Stack choices**
- **Backend:** Next.js **Route Handlers** (`apps/web/app/api/**/route.ts`, **Node runtime** — not
  Edge; web3.js/spl-token need Node) for auth, run lifecycle, and leaderboard reads — one codebase,
  one Vercel deploy. `apps/web` has no `app/api` today; this is all net-new, and the Next 16
  `AGENTS.md` warning applies (check `node_modules/next/dist/docs/` before writing route handlers).
- **Money movement is isolated in a separate `packages/treasury` worker** (Node, mirrors the
  existing `packages/mint` layout) that holds the hot-wallet key — **the internet-facing Vercel
  process never touches the signing key.** **Vercel Cron** hits a `CRON_SECRET`-protected trigger
  route weekly; that route only kicks the worker (or the worker self-schedules on Railway/Render/
  Fly). Weekly cadence is fine on lower Vercel tiers.
- **Database:** Postgres — **Neon** (serverless, Vercel-native) with **Drizzle ORM** (light,
  TypeScript). Supabase is an equally fine alternative.
- **Game engine:** hand-rolled **HTML5 Canvas + `requestAnimationFrame`** in a client component
  (no Phaser/kaboom — smaller bundle, matches our pixel art, `ctx.imageSmoothingEnabled = false`).
  The core is a **deterministic fixed-timestep simulation** (`lib/game/engine.ts`, framework-free,
  stepped at a fixed 60 Hz from server seed + inputs) — importable by **both** the browser and the
  server validator, which is what makes anti-cheat re-simulation possible. Reuse the `mulberry32`
  RNG in `packages/nft/src/pixel.mjs` for the shared obstacle/coin stream, and the `Layer` pixel
  class (pure array math, no DOM/`sharp` in its core) ported to a canvas so the runner sprite is
  literally the same bull as the logo/NFTs.
- **Auth:** SIWS — Phantom `signMessage` over a server nonce; verify with `tweetnacl`; issue a
  short-lived JWT session cookie.

**Data model (Drizzle/Postgres)**
- `players` — wallet pubkey (PK), created_at, banned, total_points, total_earned
- `auth_nonces` — nonce, wallet, expires_at (SIWS replay protection)
- `competitions` — id, starts_at, ends_at, status(open|closed|paid), pool_lamports, pool_tokens
- `runs` — id, wallet, competition_id, seed, run_token(HMAC), started_at, submitted_at,
  score, coins, input_hash, valid, flag_reason
- `payouts` — id, competition_id, wallet, rank, amount_tokens, tx_sig, status, idempotency_key
- `treasury_ops` — id, kind(claim|swap|distribute), amount, tx_sig, status, created_at (audit +
  idempotency for the pipeline)

**Reward pipeline (weekly cron, each step idempotent & re-runnable)**
1. **close-competition** — freeze the leaderboard, snapshot final ranks, create `payouts` rows.
2. **claim-fees** — pump SDK `collectCoinCreatorFeeInstructions` → SOL into reward wallet; log
   `treasury_ops`.
3. **buy-tokens** — Jupiter quote+swap SOL→$SOLBULLS (`TOKEN.mint`); log op + realized token amount.
4. **distribute** — for each `payouts` row, SPL transfer; idempotent by `idempotency_key`; retry
   failures; write `tx_sig` back so the leaderboard can link Solscan.
Payout curve: top-N split of that week's realized token pot (e.g. 40/24/16/… decay), a fixed
budget that can never exceed fees earned.

**Anti-cheat (server-authoritative, pragmatic for a memecoin game)**
- `/api/run/start` issues `runId`, a **server seed**, and an **HMAC run token**; client renders the
  deterministic stream from the seed (same obstacles/coins the server knows).
- `/api/run/submit` sends the input log + claimed score/coins + run token. Server **re-simulates**
  the run from seed+inputs (or sanity-checks: coins ≤ max reachable, score consistent with
  duration/distance, plausible input timing) and rejects/for-review mismatches.
- Rate limits, **one active run per session**, minimum run duration, **per-wallet daily/weekly
  caps**, anomaly flags. Not bank-grade — bounded weekly pot already caps the damage.

---

## Reuse (don't rebuild)

- `apps/web/lib/config.ts` — `TOKEN` (mint/decimals), `RPC_ENDPOINT`, `LINKS`. Add game/reward env.
- `apps/web/components/providers.tsx`, `wallet-button.tsx` — wallet access + Phantom deeplink;
  extend with a "Sign in" (SIWS `signMessage`) action.
- `apps/web/lib/mint.ts` — the Umi client-side transaction pattern (reference for building txs).
- `packages/mint/**` — **server-side Umi/Solana patterns already exist** (keypair loading, Umi
  setup, sendAndConfirm). The claim/swap/transfer services extend these; add pump SDK + Jupiter.
- `packages/nft/src/pixel.mjs` + `draw-layers.mjs` — the 100×100 pixel toolkit and the SolBull
  sprite. Add a `make-game-sprites.mjs` that exports runner frames (bull run cycle), the **Bear**
  chaser, a **$SOLBULLS coin**, and obstacles into `apps/web/public/game/`.
- `mulberry32` seeded RNG (in `packages/nft/src/generate.mjs`) — reuse for the run seed stream.
- Theme classes `gradient-text/-bg/-border`, `color-ink*` (`apps/web/app/globals.css`) for HUD/UI.
- Nav: add `/game` and `/leaderboard` to the `NAV` array in `apps/web/components/site-nav.tsx`.

## Files to create (representative)

- Client game: `apps/web/app/game/page.tsx`, `apps/web/components/game/{Engine,Canvas,HUD,TouchControls}.tsx`, `apps/web/lib/game/{engine,rng,sprites,stream}.ts`
- Leaderboard: `apps/web/app/leaderboard/page.tsx`, `apps/web/components/leaderboard/*`
- API: `apps/web/app/api/auth/{nonce,verify}/route.ts`, `apps/web/app/api/run/{start,submit}/route.ts`, `apps/web/app/api/{leaderboard,me}/route.ts`, `apps/web/app/api/cron/{close,claim,buy,distribute}/route.ts`
- Server libs: `apps/web/lib/server/{db,schema,auth,siws,treasury,pump,jupiter,anticheat}.ts`
- Sprites: `packages/nft/src/make-game-sprites.mjs` → `apps/web/public/game/*`
- Docs: `docs/GAME_PLAN.md` (committed version of this plan) + reward-wallet ops runbook

## Workstreams (built together, devnet-first, each independently testable)

- **WS1 — Game (no rewards):** canvas runner, touch controls, sprites, local high score. Ships as
  pure fun even if the backend lags. This is the demo.
- **WS2 — Backend + auth + leaderboard:** DB + Drizzle schema, SIWS login, `/api/run/start|submit`
  with anti-cheat, off-chain points, `/api/leaderboard`. Game now records real scores per wallet.
- **WS3 — Reward pipeline (devnet then mainnet):** reward wallet, pump fee-claim, Jupiter buy, SPL
  distribute, cron orchestration, payout rows + Solscan links on the leaderboard. Test end-to-end
  on devnet with the mock token before any mainnet money moves.

## Verification

- **Game:** `cd apps/web && npm run dev`, open `/game` on a phone (and Phantom in-app browser);
  verify 60fps, touch lanes/jump, coin collection, bear catch-up = game over. `npm run build` green.
- **Auth/leaderboard:** sign in with Phantom; complete a run; confirm score appears under your
  wallet on `/leaderboard`; attempt a forged `submit` (inflated score) and confirm the server
  rejects it.
- **Pipeline (devnet):** run the cron routes manually against the devnet mock token — claim →
  Jupiter buy (or stub on devnet) → distribute to a test wallet; confirm `payouts.tx_sig` on the
  explorer and idempotency (re-running distribute sends nothing twice).
- **Anti-cheat unit tests** for the re-simulation/validation in `lib/server/anticheat.ts`.

## Risks & open questions (must confirm before mainnet money)

- **Legal/regulatory optics:** paying real value for gameplay can read as gambling/sweepstakes in
  some jurisdictions. Mitigate: **no entry fee**, skill-based, clear "not gambling / rewards from
  community fees" disclaimers, and consider geo-restrictions. Owner should get comfortable with
  this framing.
- **Hot-wallet risk:** the reward wallet and the creator-fee claim authority hold/spend real funds
  from a server. Keys in env/KMS, **never in the repo**; cap balances; alerting; ideally a
  dedicated low-balance wallet topped up per cycle. This is the single biggest security surface.
- **Bot farming:** even with a bounded weekly pot, bots can crowd the leaderboard. Anti-cheat +
  per-wallet caps + optional token-hold or NFT-hold gate to enter the paid competition.
- **Cost/ops:** Postgres (Neon/Supabase free tier ok to start), Helius RPC, Vercel Cron (may need
  Pro), Jupiter (free). Modest but nonzero and ongoing.
- **Open decisions:** payout curve & top-N; who funds/holds the reward wallet and the fee-claim
  authority; whether entering the paid competition requires holding $SOLBULLS or a SolBull NFT;
  competition length (weekly assumed).
