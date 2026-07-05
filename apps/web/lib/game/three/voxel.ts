import * as THREE from "three";

/**
 * Loads /game/voxels.json (emitted by packages/nft/src/make-voxels.mjs)
 * and builds chibi voxel characters as InstancedMesh parts. Instance
 * matrices/colors are written ONCE; all animation happens by transforming
 * the part Groups, so per-frame cost is a handful of matrix updates.
 *
 * Characters: the HUMAN runner (the player — tinted per avatar) and the
 * SolBull (the chaser, tinted like the logo bull).
 */

export interface VoxelData {
  meta: { voxel: number; version: number };
  palettes: { bull: string[]; human: string[] };
  parts: Record<string, { palette: "bull" | "human"; vox: number[] }>;
  rig: {
    bull: { bust: Rig; legs: Rig[]; tail: Rig };
    human: { head: Rig; torso: Rig; arms: Rig[]; legs: Rig[] };
  };
}
interface Rig {
  at: [number, number, number];
}

/** bull tint: symbolic class -> hex (Classic White + Classic Tan horns) */
export const BULL_TINT: Record<string, string> = {
  F: "#f2f2f7",
  S: "#c5c5c5",
  D: "#0a0a0e",
  M: "#e2c0c1",
  m: "#d6afb2",
  HF: "#e8dcc2",
  HS: "#c9b892",
};

export interface Avatar {
  id: string;
  name: string;
  /** swatch colors for the picker UI */
  swatch: [string, string];
  tint: Record<string, string>;
}

/** selectable player avatars — same geometry, different tints */
export const AVATARS: Avatar[] = [
  {
    id: "suit",
    name: "Trader",
    swatch: ["#1d1f2c", "#c0392b"],
    tint: { HSKIN: "#e8b48c", SHIRT: "#1d1f2c", PANTS: "#12131d", HAIR: "#2b2118", ACCENT: "#c0392b", SHOE: "#0a0a0e", HEYE: "#14141c" },
  },
  {
    id: "hoodie",
    name: "Dev",
    swatch: ["#ff6ec7", "#23232e"],
    tint: { HSKIN: "#d99a66", SHIRT: "#ff6ec7", PANTS: "#23232e", HAIR: "#4a2c14", ACCENT: "#f4f4fb", SHOE: "#f4f4fb", HEYE: "#14141c" },
  },
  {
    id: "degen",
    name: "Degen",
    swatch: ["#2f8f5b", "#ffd23e"],
    tint: { HSKIN: "#f0c8a0", SHIRT: "#2f8f5b", PANTS: "#3a3a46", HAIR: "#0a0a0e", ACCENT: "#ffd23e", SHOE: "#d0342c", HEYE: "#14141c" },
  },
  {
    id: "astro",
    name: "Astro",
    swatch: ["#eef0f6", "#3ec6ff"],
    tint: { HSKIN: "#e8b48c", SHIRT: "#eef0f6", PANTS: "#cdd3e0", HAIR: "#9aa0ad", ACCENT: "#3ec6ff", SHOE: "#6f7885", HEYE: "#14141c" },
  },
];

let cache: Promise<VoxelData> | null = null;
export function loadVoxels(): Promise<VoxelData> {
  cache ??= fetch("/game/voxels.json").then((r) => {
    if (!r.ok) throw new Error("voxels.json failed to load");
    return r.json();
  });
  return cache;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export function buildPart(
  data: VoxelData,
  name: string,
  tint: Record<string, string>,
): THREE.InstancedMesh {
  const part = data.parts[name];
  const classes = data.palettes[part.palette];
  const n = part.vox.length / 4;
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(boxGeo, mat, n);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  const s = data.meta.voxel;
  for (let i = 0; i < n; i++) {
    const x = part.vox[i * 4] * s;
    const y = part.vox[i * 4 + 1] * s;
    const z = part.vox[i * 4 + 2] * s;
    const ci = part.vox[i * 4 + 3];
    m.makeScale(s, s, s);
    m.setPosition(x, y, z);
    mesh.setMatrixAt(i, m);
    color.set(tint[classes[ci]] ?? "#ff00ff");
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; // characters are always on screen
  return mesh;
}

export interface Character {
  group: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  bust?: THREE.Group;
  head?: THREE.Group;
  torso?: THREE.Group;
  tail?: THREE.Group;
}

function place(rig: Rig, voxel: number, obj: THREE.Group) {
  obj.position.set(rig.at[0] * voxel, rig.at[1] * voxel, rig.at[2] * voxel);
}

/** builds the rigged chaser bull */
export function buildBull(data: VoxelData, tint: Record<string, string> = BULL_TINT): Character {
  const v = data.meta.voxel;
  const group = new THREE.Group();

  const bust = new THREE.Group();
  bust.add(buildPart(data, "bullBust", tint));
  place(data.rig.bull.bust, v, bust);
  group.add(bust);

  const legs: THREE.Group[] = [];
  for (const r of data.rig.bull.legs) {
    const leg = new THREE.Group();
    leg.add(buildPart(data, "bullLeg", tint));
    place(r, v, leg);
    group.add(leg);
    legs.push(leg);
  }

  const tail = new THREE.Group();
  tail.add(buildPart(data, "bullTail", tint));
  place(data.rig.bull.tail, v, tail);
  group.add(tail);

  // face away from the camera (runs toward -z)
  group.rotation.y = Math.PI;
  return { group, legs, arms: [], bust, tail };
}

/** builds the rigged human runner (the player) */
export function buildHuman(data: VoxelData, tint: Record<string, string>): Character {
  const v = data.meta.voxel;
  const group = new THREE.Group();

  const mk = (part: string, rig: Rig) => {
    const g = new THREE.Group();
    g.add(buildPart(data, part, tint));
    place(rig, v, g);
    group.add(g);
    return g;
  };

  const head = mk("humanHead", data.rig.human.head);
  const torso = mk("humanTorso", data.rig.human.torso);
  const arms = data.rig.human.arms.map((r) => mk("humanArm", r));
  const legs = data.rig.human.legs.map((r) => mk("humanLeg", r));

  group.rotation.y = Math.PI;
  return { group, legs, arms, head, torso };
}
