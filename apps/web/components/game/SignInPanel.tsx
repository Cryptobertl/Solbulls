"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../wallet-button";
import {
  fetchMe,
  signIn,
  saveNickname,
  shortWallet,
  type Session,
} from "@/lib/game/api";

const NICK_RE = /^[a-zA-Z0-9_]{3,16}$/;

/**
 * Sign-in + nickname strip above the game. Signing is a message signature
 * only (proves wallet ownership) — it never approves a transaction.
 */
export function SignInPanel({
  onSession,
}: {
  onSession: (s: Session) => void;
}) {
  const { publicKey, signMessage, connected } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState("");

  const apply = useCallback(
    (s: Session) => {
      setSession(s);
      onSession(s);
    },
    [onSession],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((s) => {
      if (!cancelled) apply(s);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const doSignIn = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setError(null);
    try {
      const s = await signIn(publicKey.toBase58(), signMessage);
      apply(s);
      if (!s.nickname) setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [publicKey, signMessage, apply]);

  const doSaveNick = useCallback(async () => {
    if (!session || !NICK_RE.test(nick)) return;
    setBusy(true);
    setError(null);
    try {
      await saveNickname(nick);
      apply({ ...session, nickname: nick });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save nickname");
    } finally {
      setBusy(false);
    }
  }, [session, nick, apply]);

  if (!session) return null;

  if (!session.enabled) {
    return (
      <p className="text-xs text-zinc-500 text-center">
        Global leaderboard is coming online soon — scores are saved locally
        until then.
      </p>
    );
  }

  // signed in
  if (session.wallet) {
    return (
      <div className="flex flex-col items-center gap-2 w-full max-w-[480px]">
        {editing || !session.nickname ? (
          <div className="flex items-center gap-2 w-full justify-center">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Pick a nickname"
              maxLength={16}
              className="bg-ink-soft border border-ink-line rounded-full px-4 py-2 text-sm w-44 outline-none focus:border-bull-pink"
              aria-label="Nickname"
            />
            <button
              onClick={doSaveNick}
              disabled={busy || !NICK_RE.test(nick)}
              className="gradient-bg text-ink font-bold rounded-full px-4 py-2 text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-300">
            Racing as{" "}
            <span className="gradient-text font-bold">{session.nickname}</span>{" "}
            <span className="text-zinc-500">({shortWallet(session.wallet)})</span>{" "}
            <button
              onClick={() => {
                setNick(session.nickname ?? "");
                setEditing(true);
              }}
              className="underline text-zinc-400 text-xs"
            >
              edit
            </button>
          </p>
        )}
        {(editing || !session.nickname) && (
          <p className="text-[11px] text-zinc-500">
            3–16 letters, numbers or _ — shown on the leaderboard
          </p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  // backend live but not signed in
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[480px]">
      {connected && publicKey ? (
        <button
          onClick={doSignIn}
          disabled={busy || !signMessage}
          className="gradient-border px-5 py-2 text-sm font-bold disabled:opacity-50"
        >
          {busy ? "Check your wallet…" : "Sign in for the leaderboard 🏆"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <WalletButton />
          <p className="text-[11px] text-zinc-500">
            Connect + sign in to put your runs on the global leaderboard
          </p>
        </div>
      )}
      <p className="text-[11px] text-zinc-600 max-w-xs text-center">
        Signing is free — it only proves wallet ownership and never approves a
        transaction.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
