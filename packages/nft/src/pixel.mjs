/**
 * Tiny pixel-art toolkit. Layers are authored at 64x64 — the same pixel
 * density as the original SolBulls logo bull — and exported 1:1,
 * matching traits.config.json `size: 64`.
 */
import sharp from "sharp";

export const S = 100; // authoring grid — native resolution of the original logo

export function hex(c, a = 255) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export class Layer {
  constructor() {
    this.d = new Uint8Array(S * S * 4);
  }
  px(x, y, rgba) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    const [r, g, b, a] = rgba;
    if (a === 255) {
      this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255;
      return;
    }
    // simple over-compositing for translucent pixels
    const da = this.d[i + 3] / 255;
    const sa = a / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    this.d[i] = Math.round((r * sa + this.d[i] * da * (1 - sa)) / oa);
    this.d[i + 1] = Math.round((g * sa + this.d[i + 1] * da * (1 - sa)) / oa);
    this.d[i + 2] = Math.round((b * sa + this.d[i + 2] * da * (1 - sa)) / oa);
    this.d[i + 3] = Math.round(oa * 255);
  }
  // horizontal span, inclusive
  hspan(x0, x1, y, rgba) {
    for (let x = x0; x <= x1; x++) this.px(x, y, rgba);
  }
  rect(x0, y0, x1, y1, rgba) {
    for (let y = y0; y <= y1; y++) this.hspan(x0, x1, y, rgba);
  }
  // symmetric span: half-width hw around the 49|50 center line
  cspan(y, hw, rgba) {
    this.hspan(50 - hw, 49 + hw, y, rgba);
  }
  // mirror a pixel op across the center line
  mpx(x, y, rgba) {
    this.px(x, y, rgba);
    this.px(S - 1 - x, y, rgba);
  }
  ring(cx, cy, r0, r1, rgba) {
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= r0 && d <= r1) this.px(x, y, rgba);
      }
  }
  overlay(other) {
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        if (other.d[i + 3] > 0)
          this.px(x, y, [other.d[i], other.d[i + 1], other.d[i + 2], other.d[i + 3]]);
      }
    return this;
  }
  async save(file, outSize = S) {
    await sharp(Buffer.from(this.d), { raw: { width: S, height: S, channels: 4 } })
      .resize(outSize, outSize, { kernel: "nearest" })
      .png()
      .toFile(file);
  }
}

// deterministic RNG for textured backgrounds
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
