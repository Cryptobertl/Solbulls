"use client";

import { useState } from "react";
import { TOKEN } from "@/lib/config";

export function CopyCA() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(TOKEN.mint);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="gradient-border px-4 py-3 sm:py-2 font-mono text-xs sm:text-sm break-all text-left hover:opacity-90 max-w-full"
      title="Copy contract address"
    >
      {TOKEN.mint} {copied ? "✓ copied" : "⧉"}
    </button>
  );
}
