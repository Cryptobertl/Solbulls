import * as THREE from "three";

/**
 * Loads /game/voxels.json (emitted by packages/nft/src/make-voxels.mjs)
 * and builds chibi voxel characters as InstancedMesh parts. Instance
 * matrices/colors are written ONCE; all animation happens by transforming
 * the part Groups, so per-frame cost is a handful of matrix updates.
 */

export interface VoxelData {
  meta: { voxel: number; version: number };
  palettes: { bull: string[]; bear: string[]; bearHex: Record<string, string> };
  parts: Record<string, { palette: "bull" | "bear"; vox: number[] }>;
  rig: {
    bull: { bust: Rig; legs: Rig[]; tail: Rig };
    bear: { bust: Rig; legs: Rig[] };
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
    const cls = classes[ci];
    color.set(
      part.palette === "bear" ? data.palettes.bearHex[cls] : tint[cls] ?? "#ff00ff",
    );
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; // characters are always on screen
  return mesh;
}

export interface Character {
  group: THREE.Group;
  bust: THREE.Group;
  legs: THREE.Group[];
  tail?: THREE.Group;
}

function place(rig: Rig, voxel: number, obj: THREE.Group) {
  obj.position.set(rig.at[0] * voxel, rig.at[1] * voxel, rig.at[2] * voxel);
}

/** builds a rigged chibi character (bull or bear) */
export function buildCharacter(
  data: VoxelData,
  kind: "bull" | "bear",
  tint: Record<string, string> = BULL_TINT,
): Character {
  const v = data.meta.voxel;
  const group = new THREE.Group();

  const bust = new THREE.Group();
  bust.add(buildPart(data, kind === "bull" ? "bullBust" : "bearBust", tint));
  place(kind === "bull" ? data.rig.bull.bust : data.rig.bear.bust, v, bust);
  group.add(bust);

  const legRigs = kind === "bull" ? data.rig.bull.legs : data.rig.bear.legs;
  const legs: THREE.Group[] = [];
  for (const r of legRigs) {
    const leg = new THREE.Group();
    leg.add(buildPart(data, kind === "bull" ? "bullLeg" : "bearLeg", tint));
    place(r, v, leg);
    group.add(leg);
    legs.push(leg);
  }

  let tail: THREE.Group | undefined;
  if (kind === "bull") {
    tail = new THREE.Group();
    tail.add(buildPart(data, "bullTail", tint));
    place(data.rig.bull.tail, v, tail);
    group.add(tail);
  }

  // face away from the camera: the extruded face is at +z; the runner
  // moves toward -z, so rotate the whole character to look down-track.
  group.rotation.y = Math.PI;
  return { group, bust, legs, tail };
}
