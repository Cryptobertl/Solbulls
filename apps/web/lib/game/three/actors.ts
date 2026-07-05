import * as THREE from "three";
import type { GameState } from "../engine";
import { START_CHASE_GAP } from "../engine";
import type { Character } from "./voxel";

/**
 * Animates the voxel characters from engine state. Only part Groups are
 * transformed — instance buffers never change per frame.
 *
 * PlayerActor: the small human avatar you control.
 * BullChaserActor: the SolBull hunting you down — "Are you faster than
 * the Bull?"
 */

const LANE_X = 2.2;
export const laneX = (lane: number) => (lane - 1) * LANE_X;

const PLAYER_SCALE = 0.85;

export class PlayerActor {
  x = 0;
  vx = 0;

  constructor(public c: Character) {
    c.group.scale.setScalar(PLAYER_SCALE);
  }

  update(s: GameState, jumpY: number, dt: number) {
    const target = laneX(s.lane);
    const k = 90;
    const d = 2 * Math.sqrt(k);
    const ax = (target - this.x) * k - this.vx * d;
    this.vx += ax * dt;
    this.x += this.vx * dt;

    const g = this.c.group;
    g.position.set(this.x, jumpY * 4.5, 0);
    g.rotation.z = THREE.MathUtils.clamp(-this.vx * 0.1, -0.3, 0.3);

    // run cycle: opposite arm/leg swing
    const phase = s.dist * 2.2;
    const running = s.onGround && s.rollTicks === 0;
    const swing = running ? Math.sin(phase) * 0.85 : 0.45;
    this.c.legs[0].rotation.x = swing;
    this.c.legs[1].rotation.x = -swing;
    if (this.c.arms.length === 2) {
      this.c.arms[0].rotation.x = -swing * 0.8;
      this.c.arms[1].rotation.x = swing * 0.8;
    }
    const bob = running ? Math.abs(Math.sin(phase)) * 0.04 : 0;
    if (this.c.torso) this.c.torso.position.y = 10 * 0.045 + bob;
    if (this.c.head) {
      this.c.head.position.y = 21 * 0.045 + bob;
      this.c.head.rotation.x = running ? Math.sin(phase * 2) * 0.02 : 0.15;
    }

    // jump tuck / roll crouch
    let sy = 1;
    let rx = 0;
    if (!s.onGround) {
      sy = s.vy > 0 ? 1.08 : 0.94;
    } else if (s.rollTicks > 0) {
      sy = 0.5;
      rx = 0.65;
    }
    const targetY = PLAYER_SCALE * sy;
    g.scale.y += (targetY - g.scale.y) * Math.min(1, dt * 18);
    g.rotation.x += (rx - g.rotation.x) * Math.min(1, dt * 14);
  }
}

const BULL_SCALE = 0.62;

export class BullChaserActor {
  x = 0;
  lungeT = 1; // 1 = idle
  prevGap = START_CHASE_GAP;

  constructor(public c: Character) {
    c.group.scale.setScalar(BULL_SCALE);
  }

  update(s: GameState, playerX: number, dt: number) {
    if (s.chaseGap < this.prevGap) this.lungeT = 0; // charge!
    this.prevGap = s.chaseGap;
    this.lungeT = Math.min(1, this.lungeT + dt * 2.4);

    const closeness = (START_CHASE_GAP - s.chaseGap) / START_CHASE_GAP;
    const baseZ = 2.6 - closeness * 1.2;
    const lunge = Math.sin(Math.min(1, this.lungeT) * Math.PI) * 1.3;

    this.x += (playerX - this.x) * Math.min(1, dt * 5);
    const g = this.c.group;
    g.position.set(this.x, 0, baseZ - lunge);

    // gallop (diagonal pairs)
    const phase = s.dist * 1.9;
    const swing = Math.sin(phase) * 0.7;
    this.c.legs[0].rotation.x = swing;
    this.c.legs[3].rotation.x = swing;
    this.c.legs[1].rotation.x = -swing;
    this.c.legs[2].rotation.x = -swing;
    if (this.c.bust) {
      // head lowered, horns forward — charging posture
      this.c.bust.rotation.x = 0.16 + Math.sin(phase) * 0.03;
      this.c.bust.position.y = 5 * 0.045 + Math.abs(Math.sin(phase)) * 0.05;
    }
    if (this.c.tail) this.c.tail.rotation.x = Math.sin(phase * 0.7) * 0.4 - 0.3;
  }
}
