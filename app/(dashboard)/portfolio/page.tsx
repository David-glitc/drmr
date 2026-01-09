"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { usePortfolio } from "../../../hooks/usePortfolio";
import { useWallet } from "../../../hooks/useWallet";
import { useSolanaAccount } from "../../../hooks/useSolanaAccount";
import { useSolPrice } from "../../../hooks/useSolPrice";
import { NftCard } from "../../../components/NftCard";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { ReceiveModal } from "../../../components/ReceiveModal";
import { SendModal } from "../../../components/SendModal";
import type { NftHolding } from "../../../lib/types";
import {
  BalanceSkeleton,
  TokenListSkeleton,
  NftGridSkeleton,
  LogoImageSkeleton,
} from "../../../components/Skeletons";

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
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined); // undefined = loading, null = loaded but no logo
  const { sendSol, isConnected } = useWallet();
  const { data: solPrice } = useSolPrice();

  useEffect(() => {
    setLogoUrl(undefined); // Reset to loading state
    let isMounted = true;
    
    import("../../../lib/services/token-logo-service").then(({ getTokenLogo }) => {
      getTokenLogo(token.id, token.symbol)
        .then((url) => {
          if (isMounted) {
            setLogoUrl(url || undefined); // undefined means no logo found
          }
        })
        .catch((error) => {
          if (isMounted) {
            console.warn(`[TokenRow] Failed to load logo for ${token.symbol}:`, error);
            setLogoUrl(undefined); // Use placeholder on error
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [token.id, token.symbol]);

  const handleSend = async () => {
    if (!isConnected || !amount || !recipient) return;

    try {
      setIsSending(true);
      if (token.symbol === "SOL") {
        await sendSol(recipient, parseFloat(amount));
      }
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
    <div className="rounded-xl border border-white/10 bg-[#111118]">
      <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
            {token.symbol === "SOL" ? (
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="SOL"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.outerHTML = '<span class="text-sm font-semibold text-blue-400">SOL</span>';
                }}
              />
            ) : logoUrl === undefined ? (
              // Logo is still loading
              <LogoImageSkeleton size={12} />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={token.symbol}
                className="w-full h-full object-cover"
                onError={() => setLogoUrl(undefined)}
              />
            ) : (
              <span className="text-sm font-semibold text-blue-400">
                {token.symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white truncate">
              {token.symbol}
            </p>
            <p className="text-xs text-white/60 truncate">
              {token.symbol === "SOL" ? "Solana" : token.symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-base font-semibold text-white">
              {token.amount.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
            <p className="text-xs text-white/60">
              {token.usd.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {isOpen ? "Hide" : "Send"}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-white/10 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70">Amount</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPercentage(25)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  25%
                </button>
                <button
                  onClick={() => setPercentage(50)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  50%
                </button>
                <button
                  onClick={() => setPercentage(75)}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  75%
                </button>
                <button
                  onClick={setMax}
                  className="cursor-pointer rounded px-3 py-1 text-xs font-semibold text-blue-400 transition hover:bg-white/10 hover:text-white"
                >
                  Max
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/40"
              />
              <span className="text-sm font-semibold text-white/70">
                {token.symbol}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {amount && (
                <p className="text-xs text-white/50">
                  Max: {token.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 9,
                  })}
                </p>
              )}
              {amountUsd && (
                <p className="text-xs text-blue-400">
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
            <label className="text-sm text-white/70 mb-2 block">
              Recipient address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address"
              className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm font-mono text-white outline-none placeholder:text-white/40 focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!amount || !recipient || isSending}
            className="w-full cursor-pointer rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
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

export default function PortfolioPage() {
  const { walletAddress, isConnected, isConnecting, connect } = useWallet();
  const { data: solanaAccount, isLoading: accountLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { tokens, nfts, isLoading: portfolioLoading } = usePortfolio();
  const { data: solPrice } = useSolPrice();

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<{ symbol: string; mint?: string } | null>(null);
  const [sendToken, setSendToken] = useState<{ symbol: string; amount: number; id?: string } | null>(null);
  
  const showLoading = isConnecting;

  const totalBalance = solanaAccount && solPrice
    ? solanaAccount.balanceSol * solPrice
    : 0;

  if (!isConnected) {
    return (
      <>
        <LoadingOverlay show={isConnecting} message="Connecting Wallet..." />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-white/10 bg-[#111118] p-8 sm:p-12 text-center">
              <div className="mb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/50 bg-blue-500/20">
                  <svg
                    className="h-8 w-8 text-blue-400"
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
              <p className="mt-4 text-base leading-7 text-white/70">
                Connect your Solana wallet to view your $DRMR portfolio, track your holdings, and analyze your American Dream potential.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="mt-8 w-full rounded-xl border border-blue-500/50 bg-blue-500/20 px-6 py-4 text-base font-semibold text-blue-400 transition hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LoadingOverlay show={showLoading} message="Connecting Wallet..." />
      
      {/* Portfolio Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Portfolio</h1>
        
        {/* Balance Card */}
        {accountLoading || portfolioLoading ? (
          <BalanceSkeleton />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-white/60">BALANCE</span>
              <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-white mb-1 wrap-break-word">
              {solPrice && solanaAccount
                ? `$${totalBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "$0.00"}
            </p>
            <p className="text-sm sm:text-base text-white/70 mb-1">
              {solanaAccount
                ? `${solanaAccount.balanceSol.toFixed(4)} SOL`
                : "0.0000 SOL"}
            </p>
            <p className="text-xs sm:text-sm text-white/60">
              +$0.00 • +0.00%
            </p>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
            <button 
              onClick={() => {
                setSelectedToken({ symbol: "SOL" });
                setReceiveModalOpen(true);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Receive</span>
              </div>
            </button>
            <Link
              href="/staking"
              className="rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10 text-center"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Stake</span>
              </div>
            </Link>
            <button 
              onClick={() => {
                // Find SOL token or use default
                const solToken = tokens.find((t: { symbol: string }) => t.symbol === "SOL") || fallbackTokens.find((t: { symbol: string }) => t.symbol === "SOL");
                if (solToken) {
                  setSendToken({
                    symbol: solToken.symbol,
                    amount: solToken.amount,
                    id: solToken.id,
                  });
                } else {
                  setSendToken({
                    symbol: "SOL",
                    amount: solanaAccount?.balanceSol || 0,
                  });
                }
                setSendModalOpen(true);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </div>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Get Started with SOL */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px]">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center text-xl sm:text-2xl font-bold text-white/60">
            $
          </div>
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center text-xl sm:text-2xl font-bold text-white/60">
            SOL
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 text-center">Get started with SOL</h2>
        <p className="text-xs sm:text-sm text-white/60 text-center mb-4 sm:mb-6 max-w-sm px-2">
          Receive SOL to start trading, staking, and exploring. You&apos;ll need a tiny amount of SOL for each Solana transaction.
        </p>
        <button 
          onClick={() => {
            setSelectedToken({ symbol: "SOL" });
            setReceiveModalOpen(true);
          }}
          className="rounded-xl border border-blue-500/50 bg-blue-500/20 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-blue-400 transition hover:bg-blue-500/30"
        >
          Receive
        </button>
      </div>

      {/* Tokens Section */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Tokens</h2>
        {portfolioLoading ? (
          <TokenListSkeleton count={3} />
        ) : (
          <div className="space-y-3">
            {(tokens.length ? tokens : fallbackTokens).map((token: { id: string; symbol: string; amount: number; usd: number }) => (
              <TokenRow key={token.id} token={token} />
            ))}
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {isConnected && walletAddress && (
        <ReceiveModal
          isOpen={receiveModalOpen}
          onClose={() => {
            setReceiveModalOpen(false);
            setSelectedToken(null);
          }}
          walletAddress={walletAddress}
          tokenSymbol={selectedToken?.symbol || "SOL"}
          tokenMint={selectedToken?.mint}
        />
      )}

      {/* Send Modal */}
      <SendModal
        isOpen={sendModalOpen}
        onClose={() => {
          setSendModalOpen(false);
          setSendToken(null);
        }}
        token={sendToken || undefined}
      />

      {/* NFTs Section */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Collectibles</h2>
          {!portfolioLoading && nfts.length > 0 && (
            <p className="text-sm text-white/60">{nfts.length} {nfts.length === 1 ? "NFT" : "NFTs"}</p>
          )}
        </div>
        {portfolioLoading ? (
          <NftGridSkeleton count={6} />
        ) : nfts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {nfts.map((nft: NftHolding) => (
              <NftCard key={nft.mint || nft.name} nft={nft} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 sm:mb-6">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white/40"
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
            </div>
            <p className="text-base sm:text-lg font-semibold text-white mb-2 text-center">
              No NFTs found on this wallet
            </p>
            <p className="text-xs sm:text-sm text-white/60 text-center max-w-sm px-2">
              Your collectibles will appear here once you own any NFTs
            </p>
          </div>
        )}
      </div>
    </>
  );
}
