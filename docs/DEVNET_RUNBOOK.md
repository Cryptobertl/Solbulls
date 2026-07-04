# Devnet Runbook — burn-to-mint end to end

Run these steps from any machine with internet access (they cannot run in a sandboxed
environment without Solana RPC access). Total time: ~1–2 hours including the upload.

## 0. Prerequisites

```bash
# Solana CLI + a devnet wallet with SOL
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
solana-keygen new                 # or reuse an existing keypair
solana config set --url devnet
solana airdrop 2                  # repeat if rate-limited, or use faucet.solana.com

node --version                    # >= 20
```

⚠️ Never commit keypairs. `deploy.config.json` and `allowlist.txt` are gitignored.

## 1. Generate the collection (if not already done)

```bash
cd packages/nft && npm install && npm run generate
# → out/assets/*.png+json, out/rarity-report.json (with the top-100 allowlist pool)
```

## 2. Deploy to devnet

```bash
cd ../mint && npm install

npm run mock-token        # devnet clone of $SOLBULLS (6 decimals, 1B supply)
npm run upload            # assets + metadata → Arweave (Irys devnet); resumable
npm run collection        # Core collection with 5% royalties

# allowlist wallets (one address per line) — your test wallets for now
printf '<your-phantom-wallet>\n' > allowlist.txt

# burn price: whole tokens per mint. On devnet any number works;
# on mainnet fix it from a 7-day TWAP at ~0.1 SOL worth.
BURN_AMOUNT=100000 npm run candy-machines
# → creates OG (100 rarest, allowlist-gated) and PUB (788) machines,
#   loads all items, saves addresses to deploy.config.json

npm run test-mint         # CLI mint: burns tokens + mints one SolBull
```

Verify on https://explorer.solana.com/?cluster=devnet: the mock token supply decreased
by BURN_AMOUNT and your wallet holds a new SolBull Core asset.

## 3. Point the website at devnet

In Vercel (or `.env.local` for local dev), set:

```
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_RPC_URL=<a devnet RPC, e.g. Helius devnet endpoint>
NEXT_PUBLIC_TOKEN_MINT=<mock token mint from deploy.config.json>
NEXT_PUBLIC_CANDY_MACHINE=<candyMachinePub>
NEXT_PUBLIC_CANDY_MACHINE_OG=<candyMachineOg>       # optional, holder phase
NEXT_PUBLIC_COLLECTION=<collection>
NEXT_PUBLIC_BURN_AMOUNT=100000
```

Redeploy. The /mint page's Burn & Mint button is now live against devnet.

Send some mock $SOLBULLS to your Phantom test wallet first:

```bash
spl-token transfer <mockMint> 5000000 <phantom-wallet> --fund-recipient --url devnet
```

## 4. Phantom QA

Run the full matrix in [PHANTOM_QA.md](PHANTOM_QA.md). All five surfaces must pass
before any mainnet step.

## 5. Mainnet (after QA + community sign-off)

Same steps with differences:
- `CLUSTER=mainnet-beta`, funded hardware-wallet keypair (or Squads multisig as authority)
- **Skip mock-token** — use the real CA `6REF5qj5FBXj1V6TUHAgnQ3zaje2uTvAwYqs8b4Npump`
  (verify against docs/TOKEN.md)
- `npm run upload` costs real SOL via Irys (~$20–80)
- `BURN_AMOUNT` = the TWAP-fixed number, announced publicly beforehand
- `START_DATE=<ISO time>` on the PUB machine for a clean public-phase start
- Real holder snapshot into `allowlist.txt` for the OG machine
- Publish both candy machine addresses on the site + X community before opening
