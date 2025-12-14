"use client";

import { useCallback, useState, useEffect } from "react";

import { usePortfolio } from "../../../hooks/usePortfolio";
import { useWallet } from "../../../hooks/useWallet";
import { useSolanaAccount } from "../../../hooks/useSolanaAccount";
import { useSolPrice } from "../../../hooks/useSolPrice";
import { NftCard } from "../../../components/NftCard";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

interface TokenRowProps {
  token: {
    id: string;
    symbol: string;
    amount: number;
    usd: number;
  };
}

function TokenRow({ token }: TokenRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { sendSol, isConnected } = useWallet();
  const { data: solPrice } = useSolPrice();

  // Fetch token logo
  useEffect(() => {
    import("../../../lib/services/token-logo-service").then(({ getTokenLogo }) => {
      getTokenLogo(token.id, token.symbol).then(setLogoUrl);
    });
  }, [token.id, token.symbol]);

  const handleSend = async () => {
    if (!isConnected || !amount || !recipient) return;

    try {
      setIsSending(true);
      if (token.symbol === "SOL") {
        await sendSol(recipient, parseFloat(amount));
      }
      // TODO: Add SPL token transfer logic here
      setAmount("");
      setRecipient("");
      setIsOpen(false);
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const setPercentage = (percent: number) => {
    const value = (token.amount * percent) / 100;
    setAmount(value.toFixed(9).replace(/\.?0+$/, ""));
  };

  const setMax = () => {
    setAmount(token.amount.toFixed(9).replace(/\.?0+$/, ""));
  };

  const amountUsd =
    token.symbol === "SOL" && solPrice && amount
      ? parseFloat(amount) * solPrice
      : null;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={token.symbol}
                className="w-full h-full object-cover"
                onError={() => setLogoUrl(null)}
              />
            ) : (
              <span className="text-sm font-semibold text-sky-300">
                {token.symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white truncate">
              {token.symbol}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {token.symbol === "SOL" ? "Solana" : token.symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-base font-semibold text-white">
              {token.amount.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
            <p className="text-xs text-slate-400">
              {token.usd.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="cursor-pointer rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
          >
            {isOpen ? "Hide" : "Send"}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-white/10 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">Amount</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPercentage(25)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  25%
                </button>
                <button
                  onClick={() => setPercentage(50)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  50%
                </button>
                <button
                  onClick={() => setPercentage(75)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  75%
                </button>
                <button
                  onClick={setMax}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-sky-300 transition hover:bg-white/10 hover:text-white"
                >
                  Max
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow numbers, decimal point, and empty string
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
              />
              <span className="text-sm font-semibold text-slate-300">
                {token.symbol}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {amount && (
                <p className="text-xs text-slate-400">
                  Max: {token.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 9,
                  })}
                </p>
              )}
              {amountUsd && (
                <p className="text-xs text-sky-300">
                  ≈ {amountUsd.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              Recipient address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-slate-500 focus:border-sky-300/50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!amount || !recipient || isSending}
            className="w-full cursor-pointer rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}

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
  const { walletAddress, isConnected, isConnecting, connect } = useWallet();
  const { data: solanaAccount, isLoading: accountLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { tokens, nfts, activity, reload, isLoading: portfolioLoading } = usePortfolio();
  const { data: solPrice } = useSolPrice();

  const [copied, setCopied] = useState(false);
  
  // Show loading overlay only during wallet connection, not during data fetching
  const showLoading = isConnecting;

  const copyAddress = useCallback(() => {
    if (walletAddress) {
      void navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [walletAddress]);

  // Show connection card when wallet is not connected
  if (!isConnected) {
    return (
      <>
        <LoadingOverlay 
          show={isConnecting} 
          message="Connecting Wallet..."
        />
        <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-8 sm:p-12 backdrop-blur-sm text-center">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-sky-500/50 bg-sky-500/20">
                <svg
                  className="h-8 w-8 text-sky-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Connect Wallet to Get Started
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Connect your Solana wallet to view your $DRMR portfolio, track your holdings, and analyze your American Dream potential.
            </p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="mt-8 w-full rounded-xl border border-sky-500/50 bg-sky-500/20 px-6 py-4 text-base font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>100% Read-Only Access</span>
              <span>•</span>
              <span>Your funds are always safe</span>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <LoadingOverlay 
        show={showLoading} 
        message="Connecting Wallet..."
      />
      <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80 sm:text-xs">
              Portfolio
            </p>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">
              Wallet overview
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
              Monitor your Solana account balance, token holdings, and NFTs in a
              single view.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">Wallet address</p>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="truncate text-xs font-mono font-semibold text-white">
                {walletAddress
                  ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                  : "Connect a wallet"}
              </p>
              {walletAddress && (
                <button
                  onClick={copyAddress}
                  className="flex-shrink-0 cursor-pointer rounded p-1 text-slate-400 transition-all duration-200 hover:scale-110 hover:text-white active:scale-95"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 animate-pulse text-green-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">SOL balance</p>
            <p className="mt-1.5 text-xl font-semibold text-white">
              {accountLoading
                ? "Loading…"
                : solanaAccount
                  ? `${solanaAccount.balanceSol.toFixed(4)} SOL`
                  : "Unavailable"}
            </p>
            <p className="text-[10px] text-slate-400">
              {solanaAccount && solPrice
                ? `${(solanaAccount.balanceSol * solPrice).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} • slot #${solanaAccount.slot}`
                : solanaAccount
                  ? `slot #${solanaAccount.slot}`
                  : ""}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400">Account status</p>
            <p className="mt-1.5 text-xl font-semibold text-white">
              {solanaAccount?.rentEpoch ?? "—"}
            </p>
            <p className="text-[10px] text-slate-400">
              {solanaAccount?.executable ? "Executable account" : ""}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80 sm:text-xs">
                Tokens
              </p>
              <h2 className="text-lg font-semibold sm:text-xl">
                Your assets
              </h2>
            </div>
          </div>

          {isConnected ? (
            <div className="mt-4 w-full overflow-x-auto">
              <div className="min-w-full space-y-2">
                {(tokens.length ? tokens : fallbackTokens).map((token) => (
                  <TokenRow key={token.id} token={token} />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Connect a wallet to view holdings.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80 sm:text-xs">
                NFTs
              </p>
              <h2 className="text-lg font-semibold sm:text-xl">
                Collectibles
              </h2>
            </div>
            {isConnected && nfts.length > 0 && (
              <p className="text-xs text-slate-400">
                {nfts.length} {nfts.length === 1 ? "NFT" : "NFTs"}
              </p>
            )}
          </div>
          {isConnected ? (
            nfts.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {nfts.map((nft) => (
                  <NftCard key={nft.mint || nft.name} nft={nft} />
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center py-12">
                <svg
                  className="h-16 w-16 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4 text-sm text-slate-400">No NFTs found</p>
                <p className="mt-1 text-xs text-slate-500">
                  This wallet doesn't have any NFTs yet
                </p>
                </div>
            )
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Connect a wallet to view NFTs.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80 sm:text-xs">
              Activity
            </p>
            <h2 className="text-lg font-semibold sm:text-xl">
              Recent transactions
            </h2>
          </div>
        </div>
        {isConnected ? (
          <div className="space-y-3">
            {activity.length > 0 ? (
              activity.map((item, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{item.timestamp}</span>
                      <span className="text-sky-300">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No recent transactions found.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">
            Connect a wallet to view transaction history.
          </p>
        )}
      </section>
    </>
  );
}

