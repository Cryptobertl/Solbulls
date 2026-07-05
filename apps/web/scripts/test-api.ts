/**
 * End-to-end API test for the game backend. Run: npm run check:api
 *
 * Boots `next dev` against a FRESH local PGlite database and walks the whole
 * ranked-run flow with a real ed25519 keypair:
 *   SIWS sign-in → nickname → run/start → play the engine → run/submit →
 *   leaderboard shows the nickname with the server-validated score.
 * Plus the negative paths that make the leaderboard trustworthy:
 *   unauthenticated start, bad signature, token replay, forged token.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { createGame, step, score, type Actions, type InputEvent } from "../lib/game/engine";
import { makeRng } from "../lib/game/rng";

const PORT = 4123;
const BASE = `http://localhost:${PORT}`;

let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log("  ok:", msg);
  else {
    failures++;
    console.error("  FAIL:", msg);
  }
}

async function waitForServer(timeoutMs = 90_000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/leaderboard`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("dev server did not come up");
}

/** Random-policy bot on the real engine; returns the genuine input log. */
function playRun(seed: number, maxTicks: number) {
  const s = createGame(seed);
  const rng = makeRng(seed ^ 0xbadc0de);
  const inputs: InputEvent[] = [];
  while (!s.over && s.tick < maxTicks) {
    const a: Actions = { left: false, right: false, jump: false, roll: false };
    const r = rng();
    if (r < 0.03) a.left = true;
    else if (r < 0.06) a.right = true;
    else if (r < 0.1) a.jump = true;
    else if (r < 0.12) a.roll = true;
    for (const k of ["left", "right", "jump", "roll"] as const) {
      if (a[k]) inputs.push({ tick: s.tick + 1, action: k });
    }
    step(s, a);
  }
  return { inputs, ticks: s.tick, score: score(s), coins: s.coins };
}

async function main() {
  rmSync(".pglite", { recursive: true, force: true });
  const server: ChildProcess = spawn("node_modules/.bin/next", ["dev", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development", BROWSER: "none" },
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", (d: Buffer) => {
    const line = d.toString();
    if (/error/i.test(line)) process.stderr.write(line);
  });

  try {
    await waitForServer();
    console.log("server up");

    const kp = nacl.sign.keyPair();
    const wallet = bs58.encode(kp.publicKey);
    let cookie = "";

    // --- auth ---
    console.log("auth:");
    const nonceRes = await fetch(`${BASE}/api/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const { nonce, message } = await nonceRes.json();
    check(typeof nonce === "string" && message.includes(wallet), "nonce issued");

    const badSig = bs58.encode(nacl.sign.detached(new TextEncoder().encode("evil"), kp.secretKey));
    const badVerify = await fetch(`${BASE}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, nonce, signature: badSig }),
    });
    check(badVerify.status === 401, "wrong-message signature rejected");

    // nonce was burned by the failed attempt — get a fresh one
    const nonce2 = await (
      await fetch(`${BASE}/api/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      })
    ).json();
    const sig = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(nonce2.message), kp.secretKey),
    );
    const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, nonce: nonce2.nonce, signature: sig }),
    });
    check(verifyRes.ok, "SIWS verify succeeds");
    cookie = (verifyRes.headers.get("set-cookie") ?? "").split(";")[0];
    check(cookie.startsWith("sb_session="), "session cookie set");

    const me = await (await fetch(`${BASE}/api/me`, { headers: { cookie } })).json();
    check(me.wallet === wallet, "me returns wallet");

    // --- nickname ---
    console.log("nickname:");
    const badNick = await fetch(`${BASE}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ nickname: "x" }),
    });
    check(badNick.status === 400, "too-short nickname rejected");
    const nickRes = await fetch(`${BASE}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ nickname: "TestBull" }),
    });
    check(nickRes.ok, "nickname saved");

    // --- ranked run ---
    console.log("ranked run:");
    const noAuth = await fetch(`${BASE}/api/run/start`, { method: "POST" });
    check(noAuth.status === 401, "run/start requires sign-in");

    const startRes = await fetch(`${BASE}/api/run/start`, {
      method: "POST",
      headers: { cookie },
    });
    const run = await startRes.json();
    check(startRes.ok && typeof run.seed === "number" && run.token, "run started with server seed");

    const played = playRun(run.seed, 60 * 60); // up to 1 min of play
    check(played.ticks > 0, `bot played ${played.ticks} ticks, local score ${played.score}`);

    const submitRes = await fetch(`${BASE}/api/run/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        runId: run.runId,
        token: run.token,
        inputs: played.inputs,
        ticks: played.ticks,
      }),
    });
    const validated = await submitRes.json();
    check(submitRes.ok, "submit accepted");
    check(
      validated.score === played.score && validated.coins === played.coins,
      `server replay matches local sim (${validated.score} pts, ${validated.coins} coins)`,
    );

    // --- anti-cheat ---
    console.log("anti-cheat:");
    const replayAttack = await fetch(`${BASE}/api/run/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        runId: run.runId,
        token: run.token,
        inputs: played.inputs,
        ticks: played.ticks,
      }),
    });
    check(replayAttack.status === 409, "token replay rejected (run already closed)");

    const start2 = await (
      await fetch(`${BASE}/api/run/start`, { method: "POST", headers: { cookie } })
    ).json();
    const forged = await fetch(`${BASE}/api/run/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        runId: start2.runId,
        token: `${Date.now() + 60_000}.forgedforgedforged`,
        inputs: [],
        ticks: 100,
      }),
    });
    check(forged.status === 401, "forged token rejected");

    // --- leaderboard ---
    console.log("leaderboard:");
    const board = await (await fetch(`${BASE}/api/leaderboard`, { headers: { cookie } })).json();
    const row = board.rows?.find((r: { wallet: string }) => r.wallet === wallet);
    check(Boolean(board.enabled), "leaderboard enabled");
    check(
      row?.nickname === "TestBull" && row?.score === played.score,
      `leaderboard shows TestBull with ${played.score}`,
    );
    check(board.viewer === wallet, "viewer highlighted");
  } finally {
    server.kill("SIGTERM");
  }

  console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
