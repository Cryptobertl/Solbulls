/**
 * Deterministic RNG (mulberry32) — the SAME algorithm used by the NFT
 * generator (packages/nft/src/pixel.mjs). Because the game simulation is
 * deterministic and only the spawn logic consumes the RNG (never real time
 * or player input), the client and the server validator produce an
 * identical obstacle/coin stream from the same seed. This is what makes
 * server-side re-simulation anti-cheat possible.
 */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
