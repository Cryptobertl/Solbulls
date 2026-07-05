"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createGame,
  step,
  score as scoreOf,
  LANES,
  TICK_HZ,
  START_BEAR_GAP,
  type GameState,
  type InputEvent,
} from "@/lib/game/engine";

type Phase = "ready" | "playing" | "over";
const SPRITE_SRC = ["bull", "bear", "coin", "barrier", "rock"] as const;
type SpriteName = (typeof SPRITE_SRC)[number];

const HI_KEY = "solbulls-runner-hi";
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

function loadSprites(): Promise<Record<SpriteName, HTMLImageElement>> {
  return Promise.all(
    SPRITE_SRC.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([name, img]);
          img.src = `/game/${name}.png`;
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as Record<SpriteName, HTMLImageElement>);
}

export function GameCanvas({
  onRunEnd,
}: {
  onRunEnd?: (result: {
    score: number;
    coins: number;
    inputs: InputEvent[];
    ticks: number;
  }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ score: 0, coins: 0, gap: START_BEAR_GAP });
  const hi = useSyncExternalStore(subscribeHi, readHi, () => 0);

  const spritesRef = useRef<Record<SpriteName, HTMLImageElement> | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputsRef = useRef<InputEvent[]>([]);
  const pendingRef = useRef({ left: false, right: false, jump: false });
  const rafRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const loopRef = useRef<(now: number) => void>(() => {});

  useEffect(() => {
    loadSprites().then((s) => {
      spritesRef.current = s;
    });
  }, []);

  const queue = useCallback((action: "left" | "right" | "jump") => {
    if (stateRef.current && !stateRef.current.over) {
      pendingRef.current[action] = true;
    }
  }, []);

  const draw = useCallback((s: GameState) => {
    const canvas = canvasRef.current;
    const sprites = spritesRef.current;
    if (!canvas || !sprites) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, W, H);
    const laneW = W / LANES;
    for (let i = 1; i < LANES; i++) {
      ctx.strokeStyle = "#1b1b28";
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, H);
      ctx.stroke();
    }
    const off = (s.dist * 12) % 40;
    ctx.fillStyle = "#12121c";
    for (let i = 0; i < LANES; i++) {
      const cx = (i + 0.5) * laneW;
      for (let y = -40 + off; y < H; y += 40) ctx.fillRect(cx - 2, y, 4, 18);
    }

    const laneX = (lane: number) => (lane + 0.5) * laneW;
    const playerY = H * 0.82;
    const spawnY = -60;
    const size = Math.min(laneW * 0.8, 92);

    for (const e of s.entities) {
      if (e.hit) continue;
      const py = spawnY + (1 - e.y) * (playerY - spawnY);
      const img = sprites[e.kind as SpriteName];
      const es = e.kind === "coin" ? size * 0.6 : size * 0.85;
      ctx.drawImage(img, laneX(e.lane) - es / 2, py - es / 2, es, es);
    }

    const bearClose = (START_BEAR_GAP - s.bearGap) / START_BEAR_GAP;
    const bearY = playerY + 70 + (1 - bearClose) * 40;
    const bearS = size * (0.8 + bearClose * 0.25);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sprites.bear, laneX(s.lane) - bearS / 2, bearY - bearS / 2, bearS, bearS);
    ctx.globalAlpha = 1;

    const bob = s.onGround ? Math.sin(s.dist * 3) * 3 : 0;
    const jump = s.jumpY * (playerY - spawnY) * 0.5;
    const bullS = size;
    ctx.drawImage(
      sprites.bull,
      laneX(s.lane) - bullS / 2,
      playerY - bullS / 2 - jump + bob,
      bullS,
      bullS,
    );
  }, []);

  // keep the latest loop closure in a ref so the rAF callback never captures
  // a stale one and we avoid a self-referencing useCallback.
  useEffect(() => {
    loopRef.current = (now: number) => {
      const s = stateRef.current;
      if (!s) return;
      const dt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      accRef.current += dt;
      const stepDt = 1 / TICK_HZ;
      while (accRef.current >= stepDt) {
        const p = pendingRef.current;
        if (p.left) inputsRef.current.push({ tick: s.tick + 1, action: "left" });
        if (p.right) inputsRef.current.push({ tick: s.tick + 1, action: "right" });
        if (p.jump) inputsRef.current.push({ tick: s.tick + 1, action: "jump" });
        step(s, p);
        pendingRef.current = { left: false, right: false, jump: false };
        accRef.current -= stepDt;
        if (s.over) break;
      }
      draw(s);
      setHud({ score: scoreOf(s), coins: s.coins, gap: s.bearGap });

      if (s.over) {
        const finalScore = scoreOf(s);
        setPhase("over");
        if (finalScore > readHi()) writeHi(finalScore);
        onRunEnd?.({
          score: finalScore,
          coins: s.coins,
          inputs: inputsRef.current,
          ticks: s.tick,
        });
        return;
      }
      rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
    };
  }, [draw, onRunEnd]);

  const start = useCallback(() => {
    const seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
    stateRef.current = createGame(seed);
    inputsRef.current = [];
    pendingRef.current = { left: false, right: false, jump: false };
    accRef.current = 0;
    lastRef.current = performance.now();
    setPhase("playing");
    setHud({ score: 0, coins: 0, gap: START_BEAR_GAP });
    rafRef.current = requestAnimationFrame((n) => loopRef.current(n));
  }, []);

  // canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.min(parent.clientWidth, 460);
      const h = Math.min(window.innerHeight * 0.72, w * 1.6);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (stateRef.current) draw(stateRef.current);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") queue("left");
      else if (e.key === "ArrowRight" || e.key === "d") queue("right");
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") queue("jump");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue]);

  // touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sx = 0;
    let sy = 0;
    let moved = false;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      moved = false;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24 && !moved) {
        queue("jump");
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) queue(dx > 0 ? "right" : "left");
      else if (dy < 0) queue("jump");
    };
    const onMove = () => {
      moved = true;
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

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">
      <div className="flex items-center justify-between w-full max-w-[460px] text-sm">
        <span className="font-bold">
          Score <span className="gradient-text">{hud.score}</span>
        </span>
        <span className="text-zinc-300">🐂 {hud.coins}</span>
        <span className="text-zinc-300">{"🐻".repeat(Math.max(0, hud.gap))}</span>
        <span className="text-zinc-400">Best {hi}</span>
      </div>

      <div className="relative w-full max-w-[460px]">
        <canvas
          ref={canvasRef}
          className="gradient-border w-full touch-none block [image-rendering:pixelated]"
        />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/85 rounded-2xl text-center px-6">
            {phase === "ready" ? (
              <>
                <h2 className="text-3xl font-extrabold">
                  Sol<span className="gradient-text">Bulls</span> Runner
                </h2>
                <p className="text-zinc-300 text-sm max-w-xs">
                  Outrun the bear. Swipe or arrow keys to switch lanes, tap or ↑
                  to jump rocks, grab $SOLBULLS coins. Every hit lets the bear
                  closer.
                </p>
                <button
                  onClick={start}
                  className="gradient-bg text-ink font-bold rounded-full px-8 py-3 text-lg"
                >
                  Play
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-extrabold">Caught! 🐻</h2>
                <p className="text-zinc-200">
                  Score <span className="gradient-text font-bold">{hud.score}</span> ·
                  🐂 {hud.coins} coins
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

      <div className="grid grid-cols-3 gap-3 w-full max-w-[460px] sm:hidden">
        <button
          onClick={() => queue("left")}
          className="gradient-border py-4 font-bold text-xl"
          aria-label="Move left"
        >
          ◀
        </button>
        <button
          onClick={() => queue("jump")}
          className="gradient-border py-4 font-bold text-xl"
          aria-label="Jump"
        >
          ⤒
        </button>
        <button
          onClick={() => queue("right")}
          className="gradient-border py-4 font-bold text-xl"
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
