import * as THREE from "three";
import type { Entity, GameState } from "../engine";
import { laneX } from "./actors";
import {
  barrierTexture,
  coinTexture,
  powerupTexture,
  trainTexture,
} from "./textures";

/**
 * Syncs engine entities to pooled meshes each frame. Obstacles/powerups
 * are pooled Meshes keyed by entity id; coins are one InstancedMesh.
 */

export const SPAWN_DIST = 60;
const COIN_CAP = 96;

export const worldZ = (y: number) => -y * SPAWN_DIST;

interface PoolEntry {
  mesh: THREE.Object3D;
  inUse: boolean;
}

export class EntityLayer {
  root = new THREE.Group();
  private coinMesh: THREE.InstancedMesh;
  private pools = new Map<string, PoolEntry[]>();
  private live = new Map<number, THREE.Object3D>();
  private mkers: Record<string, () => THREE.Object3D>;
  private dummy = new THREE.Object3D();

  constructor() {
    // coins
    const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10);
    coinGeo.rotateZ(Math.PI / 2); // face the camera edge-on, spin around y
    const coinMat = new THREE.MeshLambertMaterial({
      map: coinTexture(),
      color: "#f5c542",
      emissive: new THREE.Color("#5a4408"),
    });
    this.coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, COIN_CAP);
    this.coinMesh.frustumCulled = false;
    this.root.add(this.coinMesh);

    const barrierMat = new THREE.MeshLambertMaterial({ map: barrierTexture() });
    const rockMat = new THREE.MeshLambertMaterial({ color: "#7c8290" });
    const gantryMat = new THREE.MeshLambertMaterial({ color: "#8d95a3" });
    const trainMat = new THREE.MeshLambertMaterial({
      map: trainTexture("#2b2b36", "#dff4ff"),
      emissive: new THREE.Color("#1a2a33"),
    });

    this.mkers = {
      rock: () => {
        const g = new THREE.Group();
        const m1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.0), rockMat);
        m1.position.y = 0.35;
        const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), rockMat);
        m2.position.set(0.2, 0.75, 0.1);
        g.add(m1, m2);
        return g;
      },
      barrier: () => {
        const g = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.25), barrierMat);
        bar.position.y = 1.0;
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), gantryMat);
        legL.position.set(-0.8, 0.5, 0);
        const legR = legL.clone();
        legR.position.x = 0.8;
        // tall enough that jumping doesn't clear it (engine rule)
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.25), barrierMat);
        top.position.y = 1.9;
        g.add(bar, legL, legR, top);
        return g;
      },
      gantry: () => {
        const g = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.5), gantryMat);
        bar.position.y = 1.25; // roll under it
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.25, 0.14), gantryMat);
        legL.position.set(-0.95, 0.62, 0);
        const legR = legL.clone();
        legR.position.x = 0.95;
        g.add(bar, legL, legR);
        return g;
      },
      train: () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 1), trainMat);
        body.name = "trainBody";
        body.position.y = 1.2;
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.3, 0.1),
          new THREE.MeshBasicMaterial({ color: "#fff1b8" }),
        );
        light.name = "headlight";
        light.position.set(0, 0.7, 0);
        g.add(body, light);
        return g;
      },
      magnet: () => this.powerupMesh("magnet"),
      mult: () => this.powerupMesh("mult"),
      shield: () => this.powerupMesh("shield"),
    };
  }

  private powerupMesh(kind: "magnet" | "mult" | "shield") {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshLambertMaterial({
        map: powerupTexture(kind),
        emissive: new THREE.Color("#222233"),
      }),
    );
    m.name = "powerup";
    return m;
  }

  private acquire(kind: string): THREE.Object3D {
    let pool = this.pools.get(kind);
    if (!pool) {
      pool = [];
      this.pools.set(kind, pool);
    }
    let entry = pool.find((p) => !p.inUse);
    if (!entry) {
      entry = { mesh: this.mkers[kind](), inUse: false };
      pool.push(entry);
      this.root.add(entry.mesh);
    }
    entry.inUse = true;
    entry.mesh.visible = true;
    return entry.mesh;
  }

  private release(mesh: THREE.Object3D) {
    mesh.visible = false;
    for (const pool of this.pools.values()) {
      const e = pool.find((p) => p.mesh === mesh);
      if (e) {
        e.inUse = false;
        return;
      }
    }
  }

  /** call every render frame */
  sync(s: GameState, shift: number, time: number) {
    // ---- coins (instanced) ----
    let ci = 0;
    for (const e of s.entities) {
      if (e.kind !== "coin" || e.hit || ci >= COIN_CAP) continue;
      const y = e.y - shift;
      if (y > 1.05) continue;
      this.dummy.position.set(
        laneX(e.lane),
        0.5 + (e.h ?? 0) * 4.5,
        worldZ(y),
      );
      this.dummy.rotation.set(0, time * 4 + e.id, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.coinMesh.setMatrixAt(ci++, this.dummy.matrix);
    }
    this.coinMesh.count = ci;
    this.coinMesh.instanceMatrix.needsUpdate = true;

    // ---- pooled obstacles / powerups ----
    const wanted = new Map<number, Entity>();
    for (const e of s.entities) {
      if (e.kind === "coin") continue;
      if (e.hit && e.kind !== "train") continue; // hit trains stay visible
      const y = e.y - shift;
      if (y > 1.05) continue;
      wanted.set(e.id, e);
    }
    // release stale
    for (const [id, mesh] of this.live) {
      if (!wanted.has(id)) {
        this.release(mesh);
        this.live.delete(id);
      }
    }
    // place live
    for (const [id, e] of wanted) {
      let mesh = this.live.get(id);
      if (!mesh) {
        mesh = this.acquire(e.kind);
        this.live.set(id, mesh);
        if (e.kind === "train") {
          // stretch this instance's body to the train length
          const body = mesh.getObjectByName("trainBody") as THREE.Mesh;
          const depth = (e.len ?? 0.4) * SPAWN_DIST;
          body.scale.z = depth;
          body.position.z = -depth / 2;
          const light = mesh.getObjectByName("headlight")!;
          light.position.z = 0.06;
        }
      }
      const y = e.y - shift;
      mesh.position.set(laneX(e.lane), 0, worldZ(y));
      if (mesh.getObjectByName("powerup") || (mesh as THREE.Mesh).name === "powerup") {
        mesh.position.y = 0.7 + Math.sin(time * 3 + id) * 0.15;
        mesh.rotation.y = time * 2;
      }
    }
  }

  rebuild() {
    // textures/materials are cheap; simplest robust restore is a fresh layer
  }
}
