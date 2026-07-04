/**
 * Shared environment for all mint scripts.
 *
 * Config comes from deploy.config.json (created by the scripts as they
 * run — each step records the addresses it created, so later steps and
 * the frontend read from one place).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const CONFIG_PATH = path.join(ROOT, "deploy.config.json");
export const NFT_OUT = path.resolve(ROOT, "../nft/out");

export const RPC =
  process.env.RPC_URL ??
  (process.env.CLUSTER === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");

export function loadConfig() {
  return fs.existsSync(CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
    : {};
}

export function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

/**
 * Wallet: set WALLET_PATH to a keypair JSON (never commit it!).
 * Defaults to ~/.config/solana/id.json like the Solana CLI.
 */
export function makeUmi() {
  const walletPath =
    process.env.WALLET_PATH ??
    path.join(process.env.HOME ?? "", ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    console.error(
      `No wallet at ${walletPath}. Run: solana-keygen new  (or set WALLET_PATH)`,
    );
    process.exit(1);
  }
  const secret = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf8")));
  const umi = createUmi(RPC).use(mplCore()).use(mplCandyMachine());
  const kp = umi.eddsa.createKeypairFromSecretKey(secret);
  umi.use(keypairIdentity(kp));
  console.log(`wallet: ${kp.publicKey}  rpc: ${RPC}`);
  return umi;
}
