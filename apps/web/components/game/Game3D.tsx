"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createGame,
  step,
  score as scoreOf,
  TICK_HZ,
  START_CHASE_GAP,
  type GameState,
  type InputEvent,
  type PowerupType,
} from "@/lib/game/engine";
import { SceneManager, type FrameEvents } from "@/lib/game/three/scene";
import { AVATARS } from "@/lib/game/three/voxel";
import { themeAt } from "@/lib/game/three/themes";

type Phase = "loading" | "ready" | "playing" | "over";

const HI_KEY = "solbulls-runner-hi";
const AVATAR_KEY = "solbulls-runner-avatar";
const HI_EVENT = "solbulls-runner-hi-change";
function readHi(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(localStorage.getItem(HI_KEY) ?? "0");
  return Number.isNaN(v) ? 0 : v;
}
function writeHi(v: number) {
  localStorage.setItem(HI_KEY, String(v));
  window.dispatchEvent(new Event(HI_EVENT));
}
function subscribeHi(cb: () => void) {
  window.addEventListener(HI_EVENT, cb);
  return () => window.removeEventListener(HI_EVENT, cb);
}

interface Hud {
  score: number;
  coins: number;
  gap: number;
  magnet: boolean;
  mult: boolean;
  shield: boolean;
  theme: string;
}

export default function Game3D({
  onRunEnd,
  getRun,
}: {
  onRunEnd?: (result: {
    score: number;
    coins: number;
    inputs: InputEvent[];
    ticks: number;
  }) => void;
  /** Ranked mode: fetches a server-issued seed; null falls back to local play */
  getRun?: () => Promise<{ seed: number } | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [hud, setHud] = useState<Hud>({
    score: 0, coins: 0, gap: START_CHASE_GAP, magnet: false, mult: false, shield: false, theme: "Ice City",
  });
  const hi = useSyncExternalStore(subscribeHi, readHi, () => 0);
  const [avatarId, setAvatarId] = useState<string>(
    () => localStorage.getItem(AVATAR_KEY) ?? AVATARS[0].id,
  );
  const avatarRef = useRef(avatarId);

  const mgrRef = useRef<SceneManager | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputsRef = useRef<InputEvent[]>([]);
  const pendingRef = useRef({ left: false, right: false, jump: false, roll: false });
  const rafRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const startTimeRef = useRef(0);
  const loopRef = useRef<(now: number) => void>(() => {});
  const prevRef = useRef({ jumpY: 0, nearMisses: 0, chaseGap: START_CHASE_GAP, pu: { magnet: 0, mult: 0, shield: false } });
  const pausedRef = useRef(false);
  const hudRef = useRef<Hud>(hud);

  const queue = useCallback((action: "left" | "right" | "jump" | "roll") => {
    if (stateRef.current && !stateRef.current.over) pendingRef.current[action] = true;
  }, []);

  // scene manager lifecycle (+ WebGL context loss recovery)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mgr: SceneManager | null = null;
    let cancelled = false;

    const build = () => {
      mgr?.dispose();
      mgr = new SceneManager(canvas, avatarRef.current);
      mgrRef.current = mgr;
      if (process.env.NODE_ENV === "development") {
        (window as unknown as { __mgr?: SceneManager }).__mgr = mgr;
      }
      resize();
      mgr.ready.then(() => {
        if (!cancelled) setPhase((p) => (p === "loading" ? "ready" : p));
        // idle render so the bull is visible on the start screen
        if (mgr && stateRef.current == null) {
          const idle = createGame(1);
          mgr.render(idle, 0, 0, 1 / 60, 0, {});
        }
      });
    };

    const resize = () => {
      const wrap = wrapRef.current;
      if (!wrap || !mgrRef.current) return;
      const w = Math.min(wrap.clientWidth, 480);
      const h = Math.min(window.innerHeight * 0.68, w * 1.5);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      mgrRef.current.resize(w, h);
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      pausedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    const onRestored = () => {
      build();
      pausedRef.current = false;
      if (stateRef.current && !stateRef.current.over) {
        lastRef.current = performance.now();
        rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
      }
    };
    const onVis = () => {
      if (document.hidden) {
        pausedRef.current = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else if (stateRef.current && !stateRef.current.over) {
        pausedRef.current = false;
        lastRef.current = performance.now();
        rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
      }
    };

    build();
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      mgr?.dispose();
      mgrRef.current = null;
    };
  }, []);

  // main loop
  useEffect(() => {
    loopRef.current = (now: number) => {
      const s = stateRef.current;
      const mgr = mgrRef.current;
      if (!s || !mgr || pausedRef.current) return;
      const dt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      accRef.current += dt;
      const stepDt = 1 / TICK_HZ;

      const prev = prevRef.current;
      const events: FrameEvents = {};
      while (accRef.current >= stepDt) {
        prev.jumpY = s.jumpY;
        const p = pendingRef.current;
        if (p.left) inputsRef.current.push({ tick: s.tick + 1, action: "left" });
        if (p.right) inputsRef.current.push({ tick: s.tick + 1, action: "right" });
        if (p.jump) inputsRef.current.push({ tick: s.tick + 1, action: "jump" });
        if (p.roll) inputsRef.current.push({ tick: s.tick + 1, action: "roll" });
        step(s, p);
        pendingRef.current = { left: false, right: false, jump: false, roll: false };
        accRef.current -= stepDt;
        if (s.over) break;
      }
      // engine-state diffs → fx events
      if (s.chaseGap < prev.chaseGap) events.hit = true;
      if (s.nearMisses > prev.nearMisses) events.nearMiss = true;
      let pu: PowerupType | null = null;
      if (s.magnetTicks > prev.pu.magnet && s.magnetTicks > 400) pu = "magnet";
      if (s.multTicks > prev.pu.mult && s.multTicks > 500) pu = "mult";
      if (s.shield && !prev.pu.shield) pu = "shield";
      if (pu) events.powerup = pu;
      prev.chaseGap = s.chaseGap;
      prev.nearMisses = s.nearMisses;
      prev.pu = { magnet: s.magnetTicks, mult: s.multTicks, shield: s.shield };

      const alpha = Math.min(1, accRef.current / stepDt);
      const jumpY = prev.jumpY + (s.jumpY - prev.jumpY) * alpha;
      const time = (now - startTimeRef.current) / 1000;
      mgr.render(s, alpha, jumpY, dt, time, events);

      // throttled HUD
      const next: Hud = {
        score: scoreOf(s),
        coins: s.coins,
        gap: s.chaseGap,
        magnet: s.magnetTicks > 0,
        mult: s.multTicks > 0,
        shield: s.shield,
        theme: themeAt(s.dist).a.name,
      };
      const h = hudRef.current;
      if (
        next.score !== h.score || next.coins !== h.coins || next.gap !== h.gap ||
        next.magnet !== h.magnet || next.mult !== h.mult || next.shield !== h.shield ||
        next.theme !== h.theme
      ) {
        hudRef.current = next;
        setHud(next);
      }

      if (s.over) {
        const finalScore = scoreOf(s);
        setPhase("over");
        if (finalScore > readHi()) writeHi(finalScore);
        onRunEnd?.({ score: finalScore, coins: s.coins, inputs: inputsRef.current, ticks: s.tick });
        return;
      }
      rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
    };
  }, [onRunEnd]);

  const pickAvatar = useCallback((id: string) => {
    setAvatarId(id);
    avatarRef.current = id;
    localStorage.setItem(AVATAR_KEY, id);
    const mgr = mgrRef.current;
    if (mgr) {
      mgr.setAvatar(id);
      // refresh the idle preview so the new avatar shows immediately
      if (!stateRef.current || stateRef.current.over) {
        const idle = createGame(1);
        mgr.render(idle, 0, 0, 1 / 60, 0, {});
      }
    }
  }, []);

  const startingRef = useRef(false);
  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    let seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
    if (getRun) {
      // server-issued seed makes the run rank on the global leaderboard
      const run = await getRun().catch(() => null);
      if (run) seed = run.seed;
    }
    startingRef.current = false;
    stateRef.current = createGame(seed);
    inputsRef.current = [];
    pendingRef.current = { left: false, right: false, jump: false, roll: false };
    prevRef.current = { jumpY: 0, nearMisses: 0, chaseGap: START_CHASE_GAP, pu: { magnet: 0, mult: 0, shield: false } };
    accRef.current = 0;
    lastRef.current = performance.now();
    startTimeRef.current = lastRef.current;
    pausedRef.current = false;
    setPhase("playing");
    rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
  }, [getRun]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") queue("left");
      else if (e.key === "ArrowRight" || e.key === "d") queue("right");
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") queue("jump");
      else if (e.key === "ArrowDown" || e.key === "s") queue("roll");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue]);

  // touch swipes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0, sy = 0, moved = false;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      moved = false;
    };
    const onMove = () => { moved = true; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24 && !moved) return queue("jump");
      if (Math.abs(dx) > Math.abs(dy)) queue(dx > 0 ? "right" : "left");
      else if (dy < 0) queue("jump");
      else queue("roll");
    };
    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [queue]);

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">
      <div className="flex items-center justify-between w-full max-w-[480px] text-sm">
        <span className="font-bold">
          Score <span className="gradient-text">{hud.score}</span>
        </span>
        <span className="text-zinc-300">🐂 {hud.coins}</span>
        <span className="text-zinc-300">
          {hud.shield && "🛡️"}
          {hud.magnet && "🧲"}
          {hud.mult && "✖️2"}
          {"🐂".repeat(Math.max(0, hud.gap))}
        </span>
        <span className="text-zinc-400">Best {hi}</span>
      </div>

      <div ref={wrapRef} className="relative w-full max-w-[480px]">
        <canvas
          ref={canvasRef}
          className="gradient-border w-full touch-none block"
        />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-widest text-zinc-400 pointer-events-none">
          {phase === "playing" ? hud.theme : ""}
        </div>

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/85 rounded-2xl text-center px-6">
            {phase === "loading" ? (
              <p className="text-zinc-300 animate-pulse">Loading the herd…</p>
            ) : phase === "ready" ? (
              <>
                <h2 className="text-3xl font-extrabold">
                  Are you faster than the <span className="gradient-text">Bull</span>? 🐂
                </h2>
                <p className="text-zinc-300 text-sm max-w-xs">
                  The Bull is charging behind you. Swipe to change lanes,
                  swipe up / tap to jump, swipe down to roll under gantries.
                  Dodge trains, grab coins & powerups.
                </p>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-zinc-400">
                    Choose your runner
                  </span>
                  <div className="flex gap-3">
                    {AVATARS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => pickAvatar(a.id)}
                        aria-label={`Avatar ${a.name}`}
                        className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 border ${
                          avatarId === a.id
                            ? "border-bull-pink bg-ink-soft"
                            : "border-ink-line opacity-70"
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-md"
                          style={{
                            background: `linear-gradient(180deg, ${a.swatch[0]} 55%, ${a.swatch[1]} 45%)`,
                          }}
                        />
                        <span className="text-[10px] text-zinc-300">{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={start}
                  className="gradient-bg text-ink font-bold rounded-full px-8 py-3 text-lg"
                >
                  Run!
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-extrabold">The Bull got you! 🐂</h2>
                <p className="text-zinc-200">
                  Score <span className="gradient-text font-bold">{hud.score}</span> · 🐂{" "}
                  {hud.coins} coins
                </p>
                {hud.score >= hi && hud.score > 0 && (
                  <p className="text-bull-mint text-sm">New best!</p>
                )}
                <button
                  onClick={start}
                  className="gradient-bg text-ink font-bold rounded-full px-8 py-3 text-lg"
                >
                  Run again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 w-full max-w-[480px] sm:hidden">
        <button onClick={() => queue("left")} className="gradient-border py-4 font-bold text-xl" aria-label="Move left">◀</button>
        <button onClick={() => queue("jump")} className="gradient-border py-4 font-bold text-xl" aria-label="Jump">⤒</button>
        <button onClick={() => queue("roll")} className="gradient-border py-4 font-bold text-xl" aria-label="Roll">⤓</button>
        <button onClick={() => queue("right")} className="gradient-border py-4 font-bold text-xl" aria-label="Move right">▶</button>
      </div>
    </div>
  );
}
