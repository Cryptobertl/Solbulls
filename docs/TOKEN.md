# $SOLBULLS — Canonical Token Facts

> **This file is the single source of truth for token addresses used anywhere in this repo.**
> The frontend and mint configuration must import/copy these values from here, and any change
> to this file must be treated as security-sensitive (reviewed, double-checked against
> DexScreener and an explorer).

| Field | Value | Status |
|---|---|---|
| Ticker | `$SOLBULLS` | — |
| Chain | Solana mainnet-beta | — |
| **Token mint address (CA)** | [`6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`](https://solscan.io/token/6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump) | ✅ provided by owner (2026-07-04) · ⬜ verified on-chain |
| Launchpad | pump.fun (address suffix `pump`) | inferred from CA |
| Decimals | 6 (pump.fun standard) | ⬜ verify on-chain |
| Total supply | 1,000,000,000 (pump.fun standard) | ⬜ verify on-chain |
| Mint authority | revoked (pump.fun standard) | ⬜ verify on-chain |
| Freeze authority | none (pump.fun standard) | ⬜ verify on-chain |
| DexScreener pair | [`H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ`](https://dexscreener.com/solana/h9pwrgrkpwpubmdve8doti94aauynwkzgzv76ujk3kcq) | ✅ provided by owner |

## Verification checklist (Phase 0 gate — run before any mainnet burn config)

From any machine with internet access:

```bash
# 1. Supply, decimals, authorities
solana address  # (any keypair, just for RPC access)
spl-token supply  6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump --url mainnet-beta
spl-token display 6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump --url mainnet-beta

# 2. Cross-check the pair really trades this mint
curl -s "https://api.dexscreener.com/latest/dex/pairs/solana/H9pwRGrkPwpubmDVe8DoTi94aAUYnwKZGZv76ujK3KcQ" \
  | python3 -c "import json,sys; p=json.load(sys.stdin)['pairs'][0]; print(p['baseToken'])"
```

Expected: the pair's `baseToken.address` equals the mint above; decimals/supply match; mint &
freeze authority are revoked/none. Tick the ⬜ boxes above with the observed values and commit.

- [ ] `baseToken.address` of the DexScreener pair == `6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`
- [ ] Decimals confirmed: ___
- [ ] Total supply confirmed: ___
- [ ] Mint authority revoked
- [ ] Freeze authority none

*(These commands could not be run from the development sandbox because its network policy
blocks Solana RPC and the DexScreener API.)*
