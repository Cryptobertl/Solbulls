import "server-only";
import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Sign-In With Solana: the client signs a human-readable message
 * containing a one-time server nonce; we verify the ed25519 signature
 * against the claimed wallet pubkey.
 */

export function siwsMessage(wallet: string, nonce: string): string {
  return [
    "SolBulls Runner wants you to sign in.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    "",
    "This signature only proves wallet ownership.",
    "It does NOT approve any transaction and costs nothing.",
  ].join("\n");
}

export function verifySiws(
  wallet: string,
  nonce: string,
  signatureB58: string,
): boolean {
  try {
    const msg = new TextEncoder().encode(siwsMessage(wallet, nonce));
    const sig = bs58.decode(signatureB58);
    const pub = bs58.decode(wallet);
    if (pub.length !== 32 || sig.length !== 64) return false;
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}
