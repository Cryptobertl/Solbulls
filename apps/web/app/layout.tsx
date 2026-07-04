import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WalletContextProvider } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://solbulls.xyz"),
  title: {
    default: "SolBulls — the gang of bulls living on Solana",
    template: "%s · SolBulls",
  },
  description:
    "$SOLBULLS on Solana. Burn tokens, mint a SolBull NFT. Every mint shrinks the supply.",
  openGraph: {
    title: "SolBulls — the gang of bulls living on Solana",
    description:
      "$SOLBULLS on Solana. Burn tokens, mint a SolBull NFT. Every mint shrinks the supply.",
    images: ["/solbulls.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <WalletContextProvider>
          <SiteNav />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6">
            {children}
          </main>
          <SiteFooter />
        </WalletContextProvider>
      </body>
    </html>
  );
}
