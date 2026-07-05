import * as THREE from "three";

/**
 * Theme keyframes along the run — hexes copied from the NFT background
 * palettes in packages/nft/src/draw-layers.mjs (never import that package
 * here; it is ESM + sharp).
 */
export interface Theme {
  name: string;
  sky: string;
  fog: string;
  ground: string;
  hemi: string;
  building: string;
  window: string;
  window2: string;
  /** dist at which this theme starts */
  from: number;
}

export const THEMES: Theme[] = [
  {
    name: "Ice City",
    from: 0,
    sky: "#0e2440",
    fog: "#1c4064",
    ground: "#12233a",
    hemi: "#77aed4",
    building: "#2c5578",
    window: "#dff4ff",
    window2: "#9fd0ea",
  },
  {
    name: "Neon Skyline",
    from: 600,
    sky: "#0b0b12",
    fog: "#241436",
    ground: "#14101c",
    hemi: "#4d1d55",
    building: "#191322",
    window: "#ff6ec7",
    window2: "#3ec6ff",
  },
  {
    name: "Inferno",
    from: 1400,
    sky: "#33080a",
    fog: "#661111",
    ground: "#3a0d08",
    hemi: "#a12712",
    building: "#4a1610",
    window: "#ff8c1a",
    window2: "#ffb84d",
  },
  {
    name: "Galaxy",
    from: 2400,
    sky: "#171430",
    fog: "#171430",
    ground: "#100e22",
    hemi: "#6b3fa0",
    building: "#221c44",
    window: "#f4f4fb",
    window2: "#ffd23e",
  },
];

const BLEND_WINDOW = 120; // dist units over which themes crossfade

export interface ThemeMix {
  a: Theme;
  b: Theme;
  t: number; // 0 = a, 1 = b
  index: number;
}

export function themeAt(dist: number): ThemeMix {
  let i = 0;
  for (let k = THEMES.length - 1; k >= 0; k--) {
    if (dist >= THEMES[k].from) {
      i = k;
      break;
    }
  }
  const next = THEMES[Math.min(i + 1, THEMES.length - 1)];
  const t =
    next === THEMES[i]
      ? 0
      : THREE.MathUtils.clamp(
          (dist - (next.from - BLEND_WINDOW)) / BLEND_WINDOW,
          0,
          1,
        );
  return t > 0 ? { a: THEMES[i], b: next, t, index: i } : { a: THEMES[i], b: next, t: 0, index: i };
}

const cA = new THREE.Color();
const cB = new THREE.Color();
export function mixColor(mix: ThemeMix, key: keyof Theme, out: THREE.Color): THREE.Color {
  cA.set(mix.a[key] as string);
  cB.set(mix.b[key] as string);
  out.copy(cA).lerp(cB, mix.t);
  return out;
}
