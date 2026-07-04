# Phantom QA Matrix — mainnet launch gate

Minting must work **inside Phantom via wallet connection** on every surface. All five
surfaces below must pass on **devnet** (see [DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md))
before any mainnet deployment. Re-run the full matrix once more on mainnet with a
1-mint smoke test before announcing.

Prep per device: a wallet with devnet SOL + mock $SOLBULLS (`spl-token transfer …`),
the devnet site URL (Vercel preview or production with devnet env vars).

## The five surfaces

| # | Surface | Setup | Steps |
|---|---------|-------|-------|
| 1 | **Desktop — Phantom extension** (Chrome; repeat quickly on Brave/Firefox) | Extension installed, devnet wallet imported, "Testnet mode" ON in Phantom settings | Open /mint → Connect (Phantom listed & auto-detected) → Burn & Mint → inspect approval popup → approve → success card shows asset link |
| 2 | **iOS — Phantom in-app browser** | Phantom iOS app, same wallet, Testnet mode ON | Phantom → Browser tab → open site → /mint auto-detects provider → full mint |
| 3 | **Android — Phantom in-app browser** | Phantom Android app | Same as #2 |
| 4 | **iOS Safari → deeplink handoff** | Site opened in Safari (no provider) | /mint shows **Open in Phantom** (not Connect) → tap → lands inside Phantom's browser on /mint → complete mint |
| 5 | **Android Chrome → deeplink/MWA handoff** | Site opened in Chrome | Same as #4; also try Connect via Mobile Wallet Adapter if offered |

## Pass criteria (every surface)

- [ ] Phantom connects; $SOLBULLS balance displays correctly on /mint
- [ ] **Approval screen is legible**: shows ≈ −N $SOLBULLS and +1 NFT (or equivalent
      balance changes). A red "unknown/malicious interaction" warning = **launch blocker**
- [ ] Transaction confirms in < ~30 s; success card links to the asset
- [ ] The SolBull appears in Phantom's **Collectibles** tab with correct image + name
- [ ] Token balance decreased by exactly the burn amount (check in Phantom + explorer)
- [ ] Insufficient-balance path: with a near-empty wallet the button disables and the
      Jupiter top-up link shows (no failed tx sent)
- [ ] Rejecting the transaction in Phantom returns a clean error (no stuck spinner)
- [ ] `mintLimit`: 11th mint from one wallet fails with a guard error (test by looping
      the CLI `test-mint` or lowering the limit on a throwaway machine)
- [ ] Allowlist (OG machine): allowlisted wallet mints; non-allowlisted wallet is
      rejected — verify both

## Recording results

Copy this table into the PR/issue for the launch and fill it per surface:

```
Surface                | Connect | Approval legible | Mint OK | Collectible visible | Notes
1 ext Chrome           |         |                  |         |                     |
2 iOS in-app           |         |                  |         |                     |
3 Android in-app       |         |                  |         |                     |
4 iOS Safari deeplink  |         |                  |         |                     |
5 Android Chrome MWA   |         |                  |         |                     |
```

## Known footguns

- Phantom must be in **Testnet mode** (Settings → Developer settings) to see devnet
  balances; users forget this and report "no funds".
- The site must use a **devnet RPC** (`NEXT_PUBLIC_RPC_URL`) — the public devnet RPC
  rate-limits; a free Helius devnet key avoids flaky QA.
- Deeplink (`phantom.app/ul/browse/…`) opens the **production URL** — for QA, deploy the
  devnet-configured build to a public preview URL first (Vercel preview envs work).
- If the approval screen shows "unknown interaction": check the tx only contains the
  standard Candy Machine mint + SPL burn instructions and versioned tx format; re-test
  after any change to the mint code.
