"use client";

import { useCallback } from "react";

import { usePortfolio } from "../../../hooks/usePortfolio";
import { useWallet } from "../../../hooks/useWallet";
import { useSolanaAccount } from "../../../hooks/useSolanaAccount";

const fallbackTokens = [
  { id: "sol", symbol: "SOL", amount: 128.4, usd: 18852 },
  { id: "drmr", symbol: "DRMR", amount: 482_000, usd: 32640 },
  { id: "usdc", symbol: "USDC", amount: 6_400, usd: 6400 },
];

const fallbackActivity = [
  { title: "Staked 500 DRMR", timestamp: "2m ago", status: "Pending" },
  { title: "Claimed 2.4 SOL", timestamp: "3h ago", status: "Confirmed" },
  { title: "Burn event executed", timestamp: "1d ago", status: "Admin" },
];

export default function PortfolioPage() {
  const { walletAddress, isConnected } = useWallet();
  const { data: solanaAccount, isLoading: accountLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { tokens, nfts, activity, reload } = usePortfolio();

  const copyAddress = useCallback(() => {
    if (walletAddress) {
      void navigator.clipboard.writeText(walletAddress);
    }
  }, [walletAddress]);

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80 sm:text-sm">
              Portfolio
            </p>
            <h1 className="text-2xl font-semibold text-white sm:text-4xl">
              Wallet overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Monitor your Solana account balance, token holdings, and NFTs in a
              single view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white sm:px-5 sm:text-sm"
              onClick={() => void reload()}
              disabled={!isConnected}
            >
              Refresh
            </button>
            {walletAddress && (
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white sm:px-5 sm:text-sm"
                onClick={copyAddress}
              >
                Copy address
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_15px_45px_rgba(59,130,246,0.15)]">
            <p className="text-sm text-slate-400">Wallet address</p>
            <p className="mt-2 truncate text-lg font-semibold text-white">
              {walletAddress ?? "Connect a wallet"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_15px_45px_rgba(59,130,246,0.15)]">
            <p className="text-sm text-slate-400">SOL balance</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {accountLoading
                ? "Loading…"
                : solanaAccount
                  ? `${solanaAccount.balanceSol.toFixed(4)} SOL`
                  : "Unavailable"}
            </p>
            <p className="text-xs text-slate-400">
              {solanaAccount ? `slot #${solanaAccount.slot}` : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_15px_45px_rgba(59,130,246,0.15)]">
            <p className="text-sm text-slate-400">Account status</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {solanaAccount?.rentEpoch ?? "—"}
            </p>
            <p className="text-xs text-slate-400">
              {solanaAccount?.executable ? "Executable account" : ""}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80 sm:text-sm">
                Tokens
              </p>
              <h2 className="text-xl font-semibold sm:text-2xl">
                Your assets
              </h2>
            </div>
          </div>

          {isConnected ? (
            <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-3">
              {(tokens.length ? tokens : fallbackTokens).map((token) => (
                <div
                  key={token.id}
                  className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 shadow-[0_10px_40px_rgba(14,165,233,0.08)]"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                    <span>{token.symbol}</span>
                    <span>
                      {token.usd.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold">
                    {token.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Connect a wallet to view holdings.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
            <p className="text-sm font-semibold text-white">NFTs</p>
            <div className="mt-3 space-y-3">
              {(nfts.length
                ? nfts
                : [
                    { name: "DRMR Genesis #18", floor: "42 SOL" },
                    { name: "Helius Access #04", floor: "18 SOL" },
                  ]
              ).map((nft) => (
                <div
                  key={nft.name}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
                >
                  <span>{nft.name}</span>
                  <span className="text-rose-300">{nft.floor}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
            <p className="text-sm font-semibold text-white">Activity feed</p>
            <div className="mt-3 space-y-3 text-xs text-slate-300 sm:mt-4 sm:space-y-4 sm:text-sm">
              {(activity.length ? activity : fallbackActivity).map((item) => (
                <div key={item.title}>
                  <p className="font-medium text-white">{item.title}</p>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{item.timestamp}</span>
                    <span className="text-sky-300">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

