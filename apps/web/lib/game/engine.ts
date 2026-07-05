/**
 * SolBulls Runner — deterministic game engine.
 *
 * Framework-free and side-effect-free: the browser runs it in real time,
 * and the server re-runs the exact same steps from the same seed + input
 * log to validate a submitted score (anti-cheat). Do NOT read Date.now(),
 * Math.random(), or anything non-deterministic in here.
 *
 * Model: a 3-lane endless runner (portrait). The SolBull holds the bottom
 * row; obstacles and $SOLBULLS coins stream toward it from the top on a
 * seeded schedule. Swipe/press to change lane; jump to clear low rocks.
 * Tall barriers must be dodged by lane change. Each obstacle hit lets the
 * Bear lunge one step closer; when it catches you (0 gap left) the run ends.
 */
import { makeRng, type Rng } from "./rng";

export const LANES = 3;
export const TICK_HZ = 60;
export const START_BEAR_GAP = 3; // hits the bull can take before the bear catches it
export const COIN_VALUE = 10;

export type ObstacleType = "rock" | "barrier";
export type EntityKind = ObstacleType | "coin";

export interface Entity {
  id: number;
  kind: EntityKind;
  lane: number;
  y: number; // 1 = spawn line (top), 0 = player line (bottom); moves 1 -> 0
  hit: boolean;
}

export interface Actions {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface GameState {
  tick: number;
  dist: number;
  speed: number;
  lane: number;
  jumpY: number; // 0 on ground, up to ~0.6
  vy: number;
  onGround: boolean;
  coins: number;
  bearGap: number;
  over: boolean;
  entities: Entity[];
  nextSpawnTick: number;
  nextId: number;
  rng: Rng;
}

const DT = 1 / TICK_HZ;
const BASE_SPEED = 0.45; // field units per second
const MAX_SPEED = 1.35;
const SPEED_RAMP = 0.012; // per second of survival
const GRAVITY = 5.2;
const JUMP_V = 2.1;
const JUMP_CLEAR = 0.28; // min jumpY that clears a rock
const HIT_WINDOW = 0.06; // |y| under this at the player line = collision test

export function createGame(seed: number): GameState {
  return {
    tick: 0,
    dist: 0,
    speed: BASE_SPEED,
    lane: 1,
    jumpY: 0,
    vy: 0,
    onGround: true,
    coins: 0,
    bearGap: START_BEAR_GAP,
    over: false,
    entities: [],
    nextSpawnTick: Math.round(0.9 * TICK_HZ),
    nextId: 1,
    rng: makeRng(seed),
  };
}

function spawnWave(s: GameState) {
  // Always leave one lane clear so every wave is solvable.
  const clear = Math.floor(s.rng() * LANES);
  const coinLane = s.rng() < 0.6 ? clear : Math.floor(s.rng() * LANES);
  for (let lane = 0; lane < LANES; lane++) {
    if (lane === clear) continue;
    const kind: ObstacleType = s.rng() < 0.5 ? "rock" : "barrier";
    s.entities.push({ id: s.nextId++, kind, lane, y: 1, hit: false });
  }
  s.entities.push({ id: s.nextId++, kind: "coin", lane: coinLane, y: 1, hit: false });
}

/** Advance one fixed tick. `a` is the input sampled for this tick. */
export function step(s: GameState, a: Actions): GameState {
  if (s.over) return s;

  s.tick++;
  s.speed = Math.min(MAX_SPEED, BASE_SPEED + (s.tick * DT) * SPEED_RAMP);
  s.dist += s.speed * DT * 10;

  // lane input (one step per press; caller de-bounces to edges)
  if (a.left) s.lane = Math.max(0, s.lane - 1);
  if (a.right) s.lane = Math.min(LANES - 1, s.lane + 1);

  // jump physics
  if (a.jump && s.onGround) {
    s.vy = JUMP_V;
    s.onGround = false;
  }
  if (!s.onGround) {
    s.jumpY += s.vy * DT;
    s.vy -= GRAVITY * DT;
    if (s.jumpY <= 0) {
      s.jumpY = 0;
      s.vy = 0;
      s.onGround = true;
    }
  }

  // spawn schedule (interval tightens with speed)
  if (s.tick >= s.nextSpawnTick) {
    spawnWave(s);
    const gap = Math.max(0.55, 1.15 - (s.speed - BASE_SPEED) * 0.5);
    s.nextSpawnTick = s.tick + Math.round(gap * TICK_HZ);
  }

  // move entities toward the player and resolve collisions at the line
  for (const e of s.entities) {
    e.y -= s.speed * DT;
    if (e.hit) continue;
    if (e.lane === s.lane && Math.abs(e.y) <= HIT_WINDOW) {
      if (e.kind === "coin") {
        e.hit = true;
        s.coins++;
      } else {
        const cleared = e.kind === "rock" && s.jumpY >= JUMP_CLEAR;
        if (!cleared) {
          e.hit = true;
          s.bearGap--;
          if (s.bearGap <= 0) s.over = true;
        }
      }
    }
  }
  s.entities = s.entities.filter((e) => e.y > -0.15);
  return s;
}

export function score(s: GameState): number {
  return Math.floor(s.dist) + s.coins * COIN_VALUE;
}

/**
 * Server-side canonical replay. Re-runs the whole game from the seed and a
 * compact input log (ticks at which each action fired) and returns the true
 * score + coins. Used by /api/run/submit to reject forged client scores.
 */
export interface InputEvent {
  tick: number;
  action: "left" | "right" | "jump";
}

export function simulate(
  seed: number,
  inputs: InputEvent[],
  maxTick: number,
): { score: number; coins: number; tick: number } {
  const s = createGame(seed);
  // bucket inputs by tick for O(1) lookup
  const byTick = new Map<number, Actions>();
  for (const ev of inputs) {
    const a = byTick.get(ev.tick) ?? { left: false, right: false, jump: false };
    a[ev.action] = true;
    byTick.set(ev.tick, a);
  }
  const NONE: Actions = { left: false, right: false, jump: false };
  for (let t = 0; t < maxTick && !s.over; t++) {
    step(s, byTick.get(s.tick + 1) ?? NONE);
  }
  return { score: score(s), coins: s.coins, tick: s.tick };
}
