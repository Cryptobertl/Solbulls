/**
 * Engine determinism + invariant fuzz suite. Run: npm run check:replay
 *
 * 1. Live-loop vs simulate() equality across fuzzed seeds & random input
 *    logs (incl. rolls) — the anti-cheat guarantee.
 * 2. Same seed twice → identical periodic state traces.
 * 3. Invariants sampled every tick:
 *      - never all 3 lanes blocked by trains
 *      - over ⇔ chaseGap <= 0
 *      - shield absorbs exactly one hit (chaseGap unchanged on that hit)
 *      - coins/bonusScore never decrease
 * 4. v1-format logs (no roll events) still simulate.
 */
import {
  createGame,
  step,
  score,
  simulate,
  LANES,
  type Actions,
  type GameState,
  type InputEvent,
} from "../lib/game/engine";
import { makeRng } from "../lib/game/rng";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

function randomPolicy(bot: () => number, s: GameState): Actions {
  const a: Actions = { left: false, right: false, jump: false, roll: false };
  const r = bot();
  // mix of reactive play and random noise
  const threat = s.entities.find(
    (e) =>
      e.lane === s.lane &&
      !e.hit &&
      (e.kind === "rock" || e.kind === "barrier" || e.kind === "gantry" || e.kind === "train") &&
      e.y < 0.28 &&
      e.y > 0,
  );
  if (threat && r < 0.8) {
    if (threat.kind === "rock") a.jump = true;
    else if (threat.kind === "gantry") a.roll = true;
    else if (s.lane > 0 && bot() < 0.5) a.left = true;
    else a.right = true;
  } else {
    if (r < 0.06) a.left = true;
    else if (r < 0.12) a.right = true;
    else if (r < 0.18) a.jump = true;
    else if (r < 0.24) a.roll = true;
  }
  return a;
}

function trace(s: GameState): string {
  return [
    s.tick, s.lane, s.jumpY.toFixed(6), s.rollTicks, s.coins, s.bonusScore,
    s.chaseGap, s.magnetTicks, s.multTicks, s.shield ? 1 : 0,
    s.entities.length, Math.floor(s.dist * 1e6),
  ].join(",");
}

const SEEDS = 200;
const MAX_TICKS = 3600; // 60 s cap per run
let totalNearMisses = 0;
let shieldAbsorbs = 0;

for (let i = 0; i < SEEDS; i++) {
  const seed = (i * 2654435761 + 12345) >>> 0 || 1;
  const bot = makeRng(seed ^ 0xabcdef);

  // ---- live run with input capture + invariants ----
  const s = createGame(seed);
  const inputs: InputEvent[] = [];
  let prevBearGap = s.chaseGap;
  let prevShield = false;
  let prevCoins = 0;
  let prevBonus = 0;

  for (let t = 0; t < MAX_TICKS && !s.over; t++) {
    const a = randomPolicy(bot, s);
    const tick = s.tick + 1;
    if (a.left) inputs.push({ tick, action: "left" });
    if (a.right) inputs.push({ tick, action: "right" });
    if (a.jump) inputs.push({ tick, action: "jump" });
    if (a.roll) inputs.push({ tick, action: "roll" });
    step(s, a);

    // invariants
    const blocked = s.laneBlockedUntil.filter((u) => u > s.tick).length;
    check(blocked < LANES, `seed ${seed}: all ${LANES} lanes blocked at tick ${s.tick}`);
    check(s.over === (s.chaseGap <= 0), `seed ${seed}: over/chaseGap mismatch`);
    check(s.coins >= prevCoins, `seed ${seed}: coins decreased`);
    check(s.bonusScore >= prevBonus, `seed ${seed}: bonusScore decreased`);
    if (prevShield && !s.shield && s.chaseGap === prevBearGap) shieldAbsorbs++;
    check(
      !(prevShield && !s.shield && s.chaseGap !== prevBearGap),
      `seed ${seed}: shield consumed but chaseGap changed`,
    );
    prevBearGap = s.chaseGap;
    prevShield = s.shield;
    prevCoins = s.coins;
    prevBonus = s.bonusScore;
  }
  totalNearMisses += s.nearMisses;

  // ---- replay must match exactly ----
  const live = { score: score(s), coins: s.coins, tick: s.tick };
  const rep = simulate(seed, inputs, s.tick + 10);
  check(
    rep.score === live.score && rep.coins === live.coins && rep.tick === live.tick,
    `seed ${seed}: replay mismatch live=${JSON.stringify(live)} rep=${JSON.stringify(rep)}`,
  );

  // ---- bit-identical re-run (every 4th seed, sampled trace) ----
  if (i % 4 === 0) {
    const a1 = createGame(seed);
    const a2 = createGame(seed);
    const bot1 = makeRng(seed ^ 0x1111);
    const NONE: Actions = { left: false, right: false, jump: false, roll: false };
    const acts: Actions[] = [];
    for (let t = 0; t < 900; t++) acts.push(bot1() < 0.15 ? randomPolicy(bot1, a1) : NONE);
    // replay same action list into both
    for (let t = 0; t < 900 && !a1.over; t++) step(a1, acts[t]);
    const b2 = acts; // identical actions
    for (let t = 0; t < 900 && !a2.over; t++) step(a2, b2[t]);
    check(trace(a1) === trace(a2), `seed ${seed}: trace divergence on identical inputs`);
  }
}

// ---- v1-format logs (no roll) still simulate ----
{
  const v1inputs: InputEvent[] = [
    { tick: 30, action: "jump" },
    { tick: 90, action: "left" },
    { tick: 150, action: "right" },
  ];
  const r = simulate(424242, v1inputs, 600);
  check(r.tick > 0 && r.score >= 0, "v1 log failed to simulate");
}

console.log(
  `check-replay: ${SEEDS} seeds fuzzed · nearMisses=${totalNearMisses} · shieldAbsorbs=${shieldAbsorbs} · ${
    failures === 0 ? "ALL GREEN ✅" : failures + " FAILURES ❌"
  }`,
);
if (failures > 0) process.exit(1);
