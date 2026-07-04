# 🚀 Launch Checklist — everything up to GO

Status legend: ✅ done · 🟡 ready, needs a machine with chain access · 🔴 waiting on owner GO

## Built & committed (✅)

- ✅ Website live on Vercel (auto-deploys from `main`), all pages, Phantom-first wallet connect
- ✅ 888-piece collection generated: art drawn as code, 878 unique + 10 legendary 1/1s,
      rarity tiers, top-100 allowlist pool, seed committed → reproducible by anyone
- ✅ Real Burn & Mint transaction wired into /mint (activates via env vars, preview mode until then)
- ✅ Deployment scripts: mock token, Arweave upload, collection, OG + PUB candy machines, CLI test mint
- ✅ Runbooks: [DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md), [PHANTOM_QA.md](PHANTOM_QA.md)

## Pre-GO (🟡 do these now — still no mainnet risk)

1. **Devnet dry run** — execute DEVNET_RUNBOOK steps 0–3 from any laptop
   (`solana-keygen`, airdrop, `npm run mock-token → upload → collection → candy-machines → test-mint`).
2. **Phantom QA** — run the 5-surface matrix against the devnet deployment; fix anything red.
3. **Domain** — point `solbulls.xyz` at the Vercel project (Settings → Domains).
4. **Decisions to announce** (X community): burn amount (TWAP calc at ~0.1 SOL), allowlist
   snapshot criteria + date, launch date/time.
5. **Snapshot** — export holder wallets meeting the criteria → `packages/mint/allowlist.txt`.
6. **Ops safety** — mainnet keypair on a hardware wallet; fund ~2 SOL + upload budget;
   plan to move CM authority to a Squads multisig after creation.

## GO sequence (🔴 only on owner's explicit go)

1. Verify token facts one last time (docs/TOKEN.md checklist) — CA
   `6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`, pair cross-check.
2. `CLUSTER=mainnet-beta` runbook: upload assets → create collection → create candy
   machines with the announced `BURN_AMOUNT`, real `allowlist.txt`, `START_DATE` for PUB.
3. One smoke test mint from the team wallet (OG machine).
4. Set Vercel production env: `NEXT_PUBLIC_CLUSTER=mainnet-beta`, `NEXT_PUBLIC_RPC_URL`
   (Helius), `NEXT_PUBLIC_CANDY_MACHINE`, `NEXT_PUBLIC_CANDY_MACHINE_OG`,
   `NEXT_PUBLIC_COLLECTION`, `NEXT_PUBLIC_BURN_AMOUNT` → redeploy.
5. Publish candy machine + collection addresses on the site footer, GitHub, and X community.
6. Open OG phase → 24 h → PUB phase opens via `startDate`.
7. Watch: burned counter, mint pace, Phantom rendering of first community mints.

## Explicitly NOT done without a separate owner decision

- Anything touching mainnet (uploads, machines, env flip) — gated on GO
- Moving/holding any private keys (never share these with anyone, including AI assistants)
- Buy-and-burn, staking, marketplace listings — Phase 5 discussions
