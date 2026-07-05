import * as THREE from "three";
import type { GameState } from "../engine";
import { START_BEAR_GAP } from "../engine";
import type { Character } from "./voxel";

/**
 * Animates the chibi voxel characters from engine state. Only part
 * Groups are transformed — instance buffers never change per frame.
 */

const LANE_X = 2.2;
export const laneX = (lane: number) => (lane - 1) * LANE_X;

const BULL_SCALE = 0.6;

export class BullActor {
  x = 0;
  vx = 0;

  constructor(public c: Character) {
    c.group.scale.setScalar(BULL_SCALE);
  }

  update(s: GameState, jumpY: number, dt: number) {
    const target = laneX(s.lane);
    // critically damped spring toward the lane
    const k = 90;
    const d = 2 * Math.sqrt(k);
    const ax = (target - this.x) * k - this.vx * d;
    this.vx += ax * dt;
    this.x += this.vx * dt;

    const g = this.c.group;
    g.position.set(this.x, jumpY * 4.5, 0);
    g.rotation.z = THREE.MathUtils.clamp(-this.vx * 0.10, -0.35, 0.35);

    // gallop
    const phase = s.dist * 1.8;
    const swing = s.onGround && s.rollTicks === 0 ? Math.sin(phase) * 0.65 : 0.9;
    this.c.legs[0].rotation.x = swing; // FL
    this.c.legs[3].rotation.x = swing; // BR
    this.c.legs[1].rotation.x = -swing; // FR
    this.c.legs[2].rotation.x = -swing; // BL
    const bob = s.onGround && s.rollTicks === 0 ? Math.abs(Math.sin(phase)) * 0.05 : 0;
    this.c.bust.position.y = 5 * 0.045 + bob;
    if (this.c.tail) this.c.tail.rotation.x = Math.sin(phase * 0.7) * 0.4 - 0.3;

    // jump squash / roll tuck
    let sy = 1;
    let rx = 0;
    if (!s.onGround) {
      sy = s.vy > 0 ? 1.12 : 0.92;
    } else if (s.rollTicks > 0) {
      sy = 0.55;
      rx = 0.5;
    }
    const targetY = BULL_SCALE * sy;
    g.scale.y += (targetY - g.scale.y) * Math.min(1, dt * 18);
    g.rotation.x += (rx - g.rotation.x) * Math.min(1, dt * 14);

    // shield shimmer: subtle whole-body pulse handled via emissive in scene
  }
}

export class BearActor {
  x = 0;
  lungeT = 1; // 1 = idle
  prevGap = START_BEAR_GAP;

  constructor(public c: Character) {
    c.group.scale.setScalar(0.5);
  }

  update(s: GameState, bullX: number, dt: number) {
    if (s.bearGap < this.prevGap) this.lungeT = 0; // start lunge
    this.prevGap = s.bearGap;
    this.lungeT = Math.min(1, this.lungeT + dt * 2.4);

    const closeness = (START_BEAR_GAP - s.bearGap) / START_BEAR_GAP;
    const baseZ = 2.4 - closeness * 1.1;
    const lunge = Math.sin(Math.min(1, this.lungeT) * Math.PI) * 1.2;

    this.x += (bullX - this.x) * Math.min(1, dt * 5);
    const g = this.c.group;
    g.position.set(this.x, 0, baseZ - lunge);

    const phase = s.dist * 2.1;
    const swing = Math.sin(phase) * 0.7;
    this.c.legs[0].rotation.x = swing;
    this.c.legs[3].rotation.x = swing;
    this.c.legs[1].rotation.x = -swing;
    this.c.legs[2].rotation.x = -swing;
    this.c.bust.rotation.x = 0.12 + Math.sin(phase) * 0.03;
  }
}
