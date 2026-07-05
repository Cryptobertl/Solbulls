import { LINKS, TOKEN } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-line mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-sm text-zinc-400 flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={LINKS.community} className="hover:text-white">X Community</a>
          <a href={LINKS.telegram} className="hover:text-white">Telegram News</a>
          <a href={LINKS.telegramChat} className="hover:text-white">Telegram Chat</a>
          <a href={LINKS.dexscreener} className="hover:text-white">DexScreener</a>
          <a href={LINKS.solscan} className="hover:text-white">Solscan</a>
          <a href={LINKS.github} className="hover:text-white">GitHub</a>
        </div>
        <p className="font-mono text-xs break-all">CA: {TOKEN.mint}</p>
        <p className="text-xs text-zinc-500">
          {TOKEN.ticker} is a community meme token. Nothing on this site is
          financial advice. NFTs are collectibles; token burns are
          irreversible. Always verify the contract address from official
          channels.
        </p>
      </div>
    </footer>
  );
}
