/**
 * SolBulls Runner — deterministic game engine (v2).
 *
 * Framework-free and side-effect-free: the browser runs it in real time,
 * and the server re-runs the exact same steps from the same seed + input
 * log to validate a submitted score (anti-cheat). Do NOT read Date.now(),
 * Math.random(), or anything non-deterministic in here. All randomness
 * flows through s.rng() with a fixed draw order.
 *
 * Model: a 3-lane endless runner. The SolBull holds the player line;
 * obstacles, $SOLBULLS coins and powerups stream toward it on a seeded
 * schedule. Moves: lane change, jump (clears rocks), roll (clears
 * gantries). Trains block a lane for a stretch. Each obstacle hit lets
 * the Bear lunge one step closer; at 0 gap the run ends.
 *
 * v2 additions: roll, trains, gantries, powerups (magnet / 2x / shield),
 * coin patterns (row / arc / zigzag), near-miss bonuses, i-frames.
 */
import { makeRng, type Rng } from "./rng";

export const ENGINE_VERSION = 2;

export const LANES = 3;
export const TICK_HZ = 60;
export const START_CHASE_GAP = 3;
export const COIN_VALUE = 10;
export const ROLL_TICKS = 36; // 0.6 s tuck
export const IFRAME_TICKS = 45; // 0.75 s of post-hit invulnerability
export const MAGNET_TICKS = 480; // 8 s
export const MULT_TICKS = 600; // 10 s of 2x
export const NEAR_MISS_BONUS = 25;

export type ObstacleType = "rock" | "barrier" | "train" | "gantry";
export type PowerupType = "magnet" | "mult" | "shield";
export type EntityKind = ObstacleType | PowerupType | "coin";

const OBSTACLES: ReadonlySet<string> = new Set(["rock", "barrier", "train", "gantry"]);
const POWERUPS: ReadonlySet<string> = new Set(["magnet", "mult", "shield"]);

export interface Entity {
  id: number;
  kind: EntityKind;
  lane: number;
  /** 1 = spawn line (top), 0 = player line; moves 1 -> 0 -> off. */
  y: number;
  hit: boolean;
  /** trains only: extra length in y units (occupies [y, y+len]) */
  len?: number;
  /** arc coins only: jump height at which the coin sits */
  h?: number;
  /** near-miss already evaluated for this entity */
  nm?: boolean;
}

export interface Actions {
  left: boolean;
  right: boolean;
  jump: boolean;
  roll: boolean;
}

export interface GameState {
  tick: number;
  dist: number;
  speed: number;
  lane: number;
  jumpY: number;
  vy: number;
  onGround: boolean;
  rollTicks: number;
  iframes: number;
  magnetTicks: number;
  multTicks: number;
  shield: boolean;
  coins: number;
  bonusScore: number;
  nearMisses: number;
  chaseGap: number;
  over: boolean;
  entities: Entity[];
  nextSpawnTick: number;
  nextId: number;
  lastLaneChangeTick: number;
  prevClear: number;
  laneBlockedUntil: [number, number, number];
  rng: Rng;
}

const DT = 1 / TICK_HZ;
const BASE_SPEED = 0.45;
const MAX_SPEED = 1.35;
const SPEED_RAMP = 0.012;
const GRAVITY = 5.2;
const JUMP_V = 2.1;
/** real apex = JUMP_V^2 / (2*GRAVITY) ≈ 0.424 */
export const JUMP_APEX = (JUMP_V * JUMP_V) / (2 * GRAVITY);
const JUMP_CLEAR = 0.28;
const HIT_WINDOW = 0.06;
const ARC_COLLECT_WINDOW = 0.18;
const NEAR_MISS_LANE_TICKS = 18;

export function createGame(seed: number): GameState {
  return {
    tick: 0,
    dist: 0,
    speed: BASE_SPEED,
    lane: 1,
    jumpY: 0,
    vy: 0,
    onGround: true,
    rollTicks: 0,
    iframes: 0,
    magnetTicks: 0,
    multTicks: 0,
    shield: false,
    coins: 0,
    bonusScore: 0,
    nearMisses: 0,
    chaseGap: START_CHASE_GAP,
    over: false,
    entities: [],
    nextSpawnTick: Math.round(0.9 * TICK_HZ),
    nextId: 1,
    lastLaneChangeTick: -999,
    prevClear: 1,
    laneBlockedUntil: [0, 0, 0],
    rng: makeRng(seed),
  };
}

function mult(s: GameState): number {
  return s.multTicks > 0 ? 2 : 1;
}

function collectCoin(s: GameState, e: Entity) {
  e.hit = true;
  s.coins++;
  // extra value under 2x goes to bonusScore so `coins` stays a pure count
  s.bonusScore += COIN_VALUE * (mult(s) - 1);
}

function takeHit(s: GameState, e: Entity) {
  if (s.iframes > 0) return;
  e.hit = true;
  if (s.shield) {
    s.shield = false;
    s.iframes = IFRAME_TICKS;
    return;
  }
  s.chaseGap--;
  s.iframes = IFRAME_TICKS;
  if (s.chaseGap <= 0) s.over = true;
}

// ------------------------------------------------------------- spawning
function blockedCount(s: GameState): number {
  let n = 0;
  for (let l = 0; l < LANES; l++) if (s.laneBlockedUntil[l] > s.tick) n++;
  return n;
}

function spawnWave(s: GameState, gapSeconds: number) {
  const unblocked: number[] = [];
  for (let l = 0; l < LANES; l++) if (s.laneBlockedUntil[l] <= s.tick) unblocked.push(l);
  if (unblocked.length === 0) return; // defensive; invariant keeps >= 1 free

  // clear-lane pick; on short gaps keep it reachable from the previous clear
  let candidates = unblocked;
  if (gapSeconds < 0.8) {
    const near = unblocked.filter((l) => Math.abs(l - s.prevClear) <= 1);
    if (near.length > 0) candidates = near;
  }
  const clear = candidates[Math.floor(s.rng() * candidates.length)];
  s.prevClear = clear;

  let rockLane = -1;
  for (const lane of unblocked) {
    if (lane === clear) continue;
    const r = s.rng();
    // weights: rock .35, barrier .30, gantry .20, train .15 (dist-gated)
    let kind: ObstacleType;
    if (r < 0.35) kind = "rock";
    else if (r < 0.65) kind = "barrier";
    else if (r < 0.85) kind = "gantry";
    else kind = "train";

    if (kind === "train") {
      const blocked = blockedCount(s);
      if (s.dist < 150 || blocked >= 2 || (blocked >= 1 && s.dist < 800)) {
        kind = "barrier"; // downgrade instead of re-drawing (fixed RNG order)
      }
    }

    if (kind === "train") {
      const len = 0.35 + s.rng() * 0.45;
      s.entities.push({ id: s.nextId++, kind, lane, y: 1, hit: false, len });
      s.laneBlockedUntil[lane] = s.tick + Math.ceil((len + 0.2) / (s.speed * DT));
    } else {
      s.entities.push({ id: s.nextId++, kind, lane, y: 1, hit: false });
      if (kind === "rock" && rockLane < 0) rockLane = lane;
    }
  }

  // coin pattern: row / arc / zigzag
  const p = s.rng();
  if (p < 0.4) {
    for (let i = 0; i < 6; i++)
      s.entities.push({ id: s.nextId++, kind: "coin", lane: clear, y: 1 + i * 0.07, hit: false });
  } else if (p < 0.7) {
    // arc over the wave's rock lane when there is one (jump it, get paid)
    const arcLane = rockLane >= 0 ? rockLane : clear;
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const h = 4 * 0.38 * t * (1 - t); // parabola peaking at 0.38 < apex 0.424
      s.entities.push({
        id: s.nextId++, kind: "coin", lane: arcLane, y: 1 + i * 0.055, hit: false, h,
      });
    }
  } else {
    // zigzag: bounce across lanes starting from the clear lane
    let lane = clear;
    let dir = clear === 0 ? 1 : clear === LANES - 1 ? -1 : s.rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < 7; i++) {
      const l = s.laneBlockedUntil[lane] > s.tick ? clear : lane;
      s.entities.push({ id: s.nextId++, kind: "coin", lane: l, y: 1 + i * 0.07, hit: false });
      if (lane + dir < 0 || lane + dir >= LANES) dir = -dir;
      lane += dir;
    }
  }

  // powerup: 6% per wave, in the clear lane
  if (s.rng() < 0.06) {
    const k = s.rng();
    const kind: PowerupType = k < 1 / 3 ? "magnet" : k < 2 / 3 ? "mult" : "shield";
    s.entities.push({ id: s.nextId++, kind, lane: clear, y: 1, hit: false });
  }
}

// ---------------------------------------------------------------- step
export function step(s: GameState, a: Actions): GameState {
  if (s.over) return s;

  s.tick++;
  s.speed = Math.min(MAX_SPEED, BASE_SPEED + s.tick * DT * SPEED_RAMP);
  s.dist += s.speed * DT * 10;

  // timers
  if (s.rollTicks > 0) s.rollTicks--;
  if (s.iframes > 0) s.iframes--;
  if (s.magnetTicks > 0) s.magnetTicks--;
  if (s.multTicks > 0) s.multTicks--;

  // lane input (edge-triggered by the caller)
  if (a.left && s.lane > 0) {
    s.lane--;
    s.lastLaneChangeTick = s.tick;
  }
  if (a.right && s.lane < LANES - 1) {
    s.lane++;
    s.lastLaneChangeTick = s.tick;
  }

  // jump (cancels roll) / roll
  if (a.jump && s.onGround) {
    s.vy = JUMP_V;
    s.onGround = false;
    s.rollTicks = 0;
  } else if (a.roll && s.onGround && s.rollTicks === 0) {
    s.rollTicks = ROLL_TICKS;
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

  // spawn schedule
  if (s.tick >= s.nextSpawnTick) {
    const gap = Math.max(0.55, 1.15 - (s.speed - BASE_SPEED) * 0.5);
    spawnWave(s, gap);
    s.nextSpawnTick = s.tick + Math.round(gap * TICK_HZ);
  }

  // move entities + resolve
  for (const e of s.entities) {
    e.y -= s.speed * DT;
    if (e.hit) continue;

    if (e.kind === "coin") {
      const atLine = e.lane === s.lane && Math.abs(e.y) <= HIT_WINDOW;
      const heightOk = e.h === undefined || Math.abs(s.jumpY - e.h) < ARC_COLLECT_WINDOW;
      if (atLine && heightOk) {
        collectCoin(s, e);
      } else if (
        s.magnetTicks > 0 &&
        Math.abs(e.lane - s.lane) <= 1 &&
        e.y >= 0 &&
        e.y <= 0.25
      ) {
        collectCoin(s, e); // magnet pulls it in regardless of lane/height
      }
      continue;
    }

    if (POWERUPS.has(e.kind)) {
      if (e.lane === s.lane && Math.abs(e.y) <= HIT_WINDOW) {
        e.hit = true;
        if (e.kind === "magnet") s.magnetTicks = MAGNET_TICKS;
        else if (e.kind === "mult") s.multTicks = MULT_TICKS;
        else s.shield = true;
      }
      continue;
    }

    // obstacles
    const occupied =
      e.kind === "train"
        ? e.y <= HIT_WINDOW && e.y + (e.len ?? 0) >= -HIT_WINDOW
        : Math.abs(e.y) <= HIT_WINDOW;
    if (e.lane === s.lane && occupied) {
      const cleared =
        (e.kind === "rock" && s.jumpY >= JUMP_CLEAR) ||
        (e.kind === "gantry" && s.rollTicks > 0);
      if (!cleared) takeHit(s, e);
    }

    // near-miss: evaluate once, when the obstacle (or train tail) passes
    const tailY = e.kind === "train" ? e.y + (e.len ?? 0) : e.y;
    if (!e.nm && !e.hit && tailY < -HIT_WINDOW) {
      e.nm = true;
      const laneDodge =
        Math.abs(e.lane - s.lane) === 1 &&
        s.tick - s.lastLaneChangeTick <= NEAR_MISS_LANE_TICKS;
      const sameLaneCleared =
        e.lane === s.lane && (e.kind === "rock" || e.kind === "gantry");
      if (laneDodge || sameLaneCleared) {
        s.bonusScore += NEAR_MISS_BONUS * mult(s);
        s.nearMisses++;
      }
    }
  }
  s.entities = s.entities.filter(
    (e) => e.y + (e.kind === "train" ? e.len ?? 0 : 0) > -0.15,
  );
  return s;
}

export function score(s: GameState): number {
  return Math.floor(s.dist) + s.coins * COIN_VALUE + s.bonusScore;
}

export function isObstacle(kind: EntityKind): kind is ObstacleType {
  return OBSTACLES.has(kind);
}
export function isPowerup(kind: EntityKind): kind is PowerupType {
  return POWERUPS.has(kind);
}

/**
 * Server-side canonical replay: re-runs the whole game from the seed and
 * a compact input log. Old (v1) logs without roll events remain valid.
 */
export interface InputEvent {
  tick: number;
  action: "left" | "right" | "jump" | "roll";
}

export function simulate(
  seed: number,
  inputs: InputEvent[],
  maxTick: number,
): { score: number; coins: number; tick: number } {
  const s = createGame(seed);
  const byTick = new Map<number, Actions>();
  for (const ev of inputs) {
    const a =
      byTick.get(ev.tick) ?? { left: false, right: false, jump: false, roll: false };
    a[ev.action] = true;
    byTick.set(ev.tick, a);
  }
  const NONE: Actions = { left: false, right: false, jump: false, roll: false };
  for (let t = 0; t < maxTick && !s.over; t++) {
    step(s, byTick.get(s.tick + 1) ?? NONE);
  }
  return { score: score(s), coins: s.coins, tick: s.tick };
}
