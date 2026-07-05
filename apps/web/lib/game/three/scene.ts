import * as THREE from "three";
import type { GameState } from "../engine";
import { TICK_HZ } from "../engine";
import { BullActor, BearActor } from "./actors";
import { EntityLayer, SPAWN_DIST } from "./entities";
import { Shake, Popups } from "./fx";
import { themeAt, mixColor, type ThemeMix } from "./themes";
import {
  blobShadowTexture,
  buildingTexture,
  roadTexture,
  starsTexture,
} from "./textures";
import { buildCharacter, loadVoxels, BULL_TINT } from "./voxel";

/** frame events computed by the component from engine-state diffs */
export interface FrameEvents {
  hit?: boolean;
  nearMiss?: boolean;
  powerup?: "magnet" | "mult" | "shield" | null;
}

const DT = 1 / TICK_HZ;
const SIDE_COUNT = 12;
const SIDE_SPACING = 6;

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight;
  private road!: THREE.Mesh;
  private roadTex!: THREE.CanvasTexture;
  private buildings: THREE.Mesh[] = [];
  private buildingMat!: THREE.MeshLambertMaterial;
  private stars!: THREE.Mesh;
  private starsMat!: THREE.MeshBasicMaterial;
  private bullShadow!: THREE.Mesh;
  private bearShadow!: THREE.Mesh;
  entityLayer = new EntityLayer();
  shake = new Shake();
  popups = new Popups();
  bull: BullActor | null = null;
  bear: BearActor | null = null;
  ready: Promise<void>;

  private lastThemeIndex = -1;
  private frameTimes: number[] = [];
  private dprStep = 0; // 0: min(dpr,2) 1: 1.5 2: 1.25
  private tmpColor = new THREE.Color();
  private shakeOut = new THREE.Vector3();
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.applyDpr();

    this.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 90);
    this.scene.fog = new THREE.Fog("#1c4064", 22, 52);

    this.hemi = new THREE.HemisphereLight("#77aed4", "#12233a", 1.15);
    const dir = new THREE.DirectionalLight("#ffffff", 0.85);
    dir.position.set(-3, 6, 4);
    this.scene.add(this.hemi, dir);

    this.buildStatic();
    this.scene.add(this.entityLayer.root, this.popups.root);

    this.ready = loadVoxels().then((data) => {
      if (this.disposed) return;
      const bull = buildCharacter(data, "bull", BULL_TINT);
      const bear = buildCharacter(data, "bear");
      this.bull = new BullActor(bull);
      this.bear = new BearActor(bear);
      this.scene.add(bull.group, bear.group);
    });
  }

  private buildStatic() {
    // road
    this.roadTex = roadTexture();
    this.road = new THREE.Mesh(
      new THREE.PlaneGeometry(8, SPAWN_DIST + 14),
      new THREE.MeshLambertMaterial({ map: this.roadTex }),
    );
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.set(0, -0.01, -(SPAWN_DIST + 14) / 2 + 8);
    this.scene.add(this.road);

    // side buildings (both sides), tinted per theme
    this.buildingMat = new THREE.MeshLambertMaterial({ color: "#2c5578" });
    let h = 7919; // fixed pseudo-random heights (presentation-only)
    const rnd = () => {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < SIDE_COUNT; i++) {
        const height = 3 + rnd() * 7;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(2.5 + rnd() * 2, height, 4),
          this.buildingMat,
        );
        b.position.set(side * (6.2 + rnd() * 1.5), height / 2 - 0.02, -i * SIDE_SPACING + 6);
        this.scene.add(b);
        this.buildings.push(b);
      }
    }

    // stars backdrop (visible in neon/galaxy)
    this.starsMat = new THREE.MeshBasicMaterial({
      map: starsTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.stars = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), this.starsMat);
    this.stars.position.set(0, 18, -70);
    this.scene.add(this.stars);

    // blob shadows
    const shadowTex = blobShadowTexture();
    const mkShadow = () => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.005;
      this.scene.add(m);
      return m;
    };
    this.bullShadow = mkShadow();
    this.bearShadow = mkShadow();
  }

  private applyDpr() {
    const base = Math.min(window.devicePixelRatio || 1, 2);
    const dpr = this.dprStep === 0 ? base : this.dprStep === 1 ? Math.min(base, 1.5) : Math.min(base, 1.25);
    this.renderer.setPixelRatio(dpr);
  }

  resize(w: number, hpx: number) {
    this.renderer.setSize(w, hpx, false);
    this.camera.aspect = w / hpx;
    this.camera.updateProjectionMatrix();
  }

  private updateTheme(mix: ThemeMix) {
    mixColor(mix, "sky", this.tmpColor);
    this.renderer.setClearColor(this.tmpColor);
    this.scene.background = null;
    mixColor(mix, "fog", (this.scene.fog as THREE.Fog).color);
    mixColor(mix, "hemi", this.hemi.color);
    mixColor(mix, "ground", this.hemi.groundColor);
    mixColor(mix, "building", this.buildingMat.color);
    // window texture refresh only when the dominant theme actually changes
    if (mix.index !== this.lastThemeIndex) {
      this.lastThemeIndex = mix.index;
      const t = mix.a;
      this.buildingMat.map?.dispose();
      this.buildingMat.map = buildingTexture("#8a8a9a", t.window, t.window2);
      this.buildingMat.needsUpdate = true;
    }
    const starTarget = mix.a.name === "Galaxy" ? 0.9 : mix.a.name === "Neon Skyline" ? 0.35 : 0.05;
    this.starsMat.opacity += (starTarget - this.starsMat.opacity) * 0.05;
  }

  /**
   * @param s engine state (post-step)
   * @param alpha sub-tick interpolation 0..1
   * @param jumpY interpolated jump height
   * @param dt real seconds since last frame
   * @param time seconds since game start (render clock)
   */
  render(
    s: GameState,
    alpha: number,
    jumpY: number,
    dt: number,
    time: number,
    events: FrameEvents,
  ) {
    const shift = alpha * s.speed * DT;
    const renderDist = s.dist + shift * 10;

    this.updateTheme(themeAt(renderDist));

    // road scroll + scenery recycle
    this.roadTex.offset.y = -(renderDist * 0.09) % 1;
    for (const b of this.buildings) {
      b.position.z += (s.over ? 0 : s.speed * dt * SPAWN_DIST) / (SPAWN_DIST / 10);
      if (b.position.z > 10) b.position.z -= SIDE_COUNT * SIDE_SPACING;
    }

    // actors
    if (this.bull) {
      this.bull.update(s, jumpY, dt);
      this.bullShadow.position.x = this.bull.x;
      this.bullShadow.position.z = 0;
      const sc = 1 + jumpY * 0.9;
      this.bullShadow.scale.setScalar(sc);
      (this.bullShadow.material as THREE.MeshBasicMaterial).opacity =
        0.9 - jumpY * 1.2;
    }
    if (this.bear && this.bull) {
      this.bear.update(s, this.bull.x, dt);
      this.bearShadow.position.x = this.bear.c.group.position.x;
      this.bearShadow.position.z = this.bear.c.group.position.z;
    }

    // entities
    this.entityLayer.sync(s, shift, time);

    // fx
    if (events.hit) this.shake.trigger(0.3);
    if (events.nearMiss && this.bull) {
      this.popups.spawn(
        "+25",
        "#4dffb8",
        new THREE.Vector3(this.bull.x, 2.2, -1.5),
      );
    }
    if (events.powerup && this.bull) {
      const label =
        events.powerup === "magnet" ? "MAGNET!" : events.powerup === "mult" ? "2x!" : "SHIELD!";
      this.popups.spawn(label, "#ff6ec7", new THREE.Vector3(this.bull.x, 2.6, -1.5));
    }
    this.popups.update(dt);

    // camera
    const bx = this.bull?.x ?? 0;
    this.shake.update(dt, this.shakeOut);
    this.camera.position.set(bx * 0.45 + this.shakeOut.x, 3.4 + this.shakeOut.y, 6.2);
    this.camera.lookAt(bx * 0.8, 1.1, -10);

    this.renderer.render(this.scene, this.camera);

    // one-way DPR ratchet on sustained slow frames
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length >= 120) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.frameTimes.length = 0;
      if (avg > 22 && this.dprStep < 2) {
        this.dprStep++;
        this.applyDpr();
      }
    }
  }

  dispose() {
    this.disposed = true;
    this.renderer.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }
}
