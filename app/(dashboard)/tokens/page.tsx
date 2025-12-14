"use client";

import { useState } from "react";
import { useWallet } from "../../../hooks/useWallet";
import { usePortfolio } from "../../../hooks/usePortfolio";
import { useJupiterPrice } from "../../../hooks/useJupiterPrice";
import { TOKEN_MINTS } from "@/lib/services/jupiter-service";

// Trending tokens from Jupiter (popular Solana tokens)
const TRENDING_TOKENS = [
  { mint: TOKEN_MINTS.SOL, symbol: "SOL", name: "Solana" },
  { mint: TOKEN_MINTS.USDC, symbol: "USDC", name: "USD Coin" },
  { mint: TOKEN_MINTS.USDT, symbol: "USDT", name: "Tether USD" },
  { mint: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana" }, // Alternative SOL mint
];

export default function TokensPage() {
  const { isConnected, walletAddress } = useWallet();
  const { tokens, isLoading: portfolioLoading } = usePortfolio();
  const trendingMints = TRENDING_TOKENS.map(t => t.mint);
  const { data: trendingPrices, isLoading: pricesLoading } = useJupiterPrice(trendingMints);

  const [selectedTab, setSelectedTab] = useState<"my-tokens" | "trending">("my-tokens");

  return (
    <>
      <header className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-rose-300 sm:text-xs">
          Tokens
        </p>
        <h1 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
          Token Balances & Trending
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs text-slate-300 sm:text-sm">
          View your token holdings and discover trending tokens on Solana.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-white/10 bg-slate-900/50 p-1">
        <button
          onClick={() => setSelectedTab("my-tokens")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            selectedTab === "my-tokens"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          My Tokens
        </button>
        <button
          onClick={() => setSelectedTab("trending")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            selectedTab === "trending"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Trending
        </button>
      </div>

      {/* My Tokens Tab */}
      {selectedTab === "my-tokens" && (
        <div className="space-y-3">
          {!isConnected ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
              <p className="text-rose-300 font-semibold">Connect your wallet to view your tokens</p>
            </div>
          ) : portfolioLoading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
              <p className="text-slate-400">Loading your tokens...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
              <p className="text-slate-400">No tokens found in your wallet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 backdrop-blur-sm hover:border-rose-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                        <span className="text-rose-300 font-bold text-sm">{token.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{token.symbol}</p>
                        <p className="text-xs text-slate-400">{token.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-white">
                      {token.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    {token.usd > 0 && (
                      <p className="text-sm text-rose-300 font-semibold">
                        ${token.usd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                    {token.change && (
                      <p className={`text-xs ${token.change.startsWith("+") ? "text-rose-400" : "text-slate-400"}`}>
                        {token.change}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Tokens Tab */}
      {selectedTab === "trending" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRENDING_TOKENS.map((token) => {
            const priceData = trendingPrices?.data[token.mint];
            const price = priceData?.price || 0;

            return (
              <div
                key={token.mint}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 backdrop-blur-sm hover:border-rose-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                      <span className="text-rose-300 font-bold text-sm">{token.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{token.symbol}</p>
                      <p className="text-xs text-slate-400">{token.name}</p>
                    </div>
                  </div>
                  {pricesLoading ? (
                    <div className="h-4 w-12 animate-pulse bg-slate-700 rounded"></div>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Trending
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {pricesLoading ? (
                    <div className="h-6 w-24 animate-pulse bg-slate-700 rounded"></div>
                  ) : price > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-white">
                        ${price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </p>
                      <p className="text-xs text-rose-300">Live price via Jupiter</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Price unavailable</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
