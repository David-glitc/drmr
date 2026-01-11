"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "../../../hooks/usePortfolio";
import { useWallet } from "../../../hooks/useWallet";
import { useSolanaAccount } from "../../../hooks/useSolanaAccount";
import { useSolPrice } from "../../../hooks/useSolPrice";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { ReceiveModal } from "../../../components/ReceiveModal";
import { SendModal } from "../../../components/SendModal";
import { LogoImageSkeleton } from "../../../components/Skeletons";

interface Token {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  usd: number;
  change?: string;
  price?: number;
}

function TokenRow({ token, onMenuClick }: { token: Token; onMenuClick: () => void }) {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const { data: solPrice } = useSolPrice();

  useEffect(() => {
    setLogoUrl(undefined);
    let isMounted = true;
    
    import("../../../lib/services/token-logo-service").then(({ getTokenLogo }) => {
      getTokenLogo(token.id, token.symbol)
        .then((url) => {
          if (isMounted) {
            setLogoUrl(url || undefined);
          }
        })
        .catch((error) => {
          if (isMounted) {
            console.warn(`[TokenRow] Failed to load logo for ${token.symbol}:`, error);
            setLogoUrl(undefined);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [token.id, token.symbol]);

  const isUnknown = token.name === "Unknown Token" || !token.price;
  const price = token.price || (token.symbol === "SOL" ? solPrice : null);
  const change = token.change || (token.symbol === "SOL" ? "-0.50%" : "");
  const isPositiveChange = change.startsWith("+");
  const isNegativeChange = change.startsWith("-");

  return (
    <tr className="border-b border-white/10 hover:bg-white/5 transition">
      {/* NAME */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {token.symbol === "SOL" ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="SOL"
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  e.currentTarget.outerHTML = '<span class="text-xs font-semibold text-white">SOL</span>';
                }}
              />
            </div>
          ) : logoUrl === undefined ? (
            <LogoImageSkeleton size={10} />
          ) : logoUrl ? (
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={logoUrl}
                alt={token.symbol}
                className="w-full h-full object-cover"
                onError={() => setLogoUrl(undefined)}
              />
            </div>
          ) : isUnknown ? (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 relative">
              <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-[#111118]"></div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-blue-400">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {token.symbol === "SOL" ? "Solana" : token.name}
            </p>
            <p className="text-xs text-white/60 truncate">
              {token.symbol === "SOL" ? "SOL" : isUnknown ? token.id.slice(0, 4) + "..." + token.id.slice(-4) : token.symbol}
            </p>
          </div>
        </div>
      </td>

      {/* PRICE/24H CHANGE */}
      <td className="px-4 py-4">
        {price ? (
          <div>
            <p className="text-sm font-medium text-white">
              ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs font-medium ${
              isPositiveChange ? "text-green-400" : isNegativeChange ? "text-red-400" : "text-white/60"
            }`}>
              {change}
            </p>
          </div>
        ) : (
          <span className="text-sm text-white/40">—</span>
        )}
      </td>

      {/* BALANCE */}
      <td className="px-4 py-4">
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {token.usd > 0 
              ? `$${token.usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "$0.00"
            }
          </p>
          <p className="text-xs text-white/60">
            {token.amount > 0
              ? token.amount >= 1000000
                ? `${(token.amount / 1000000).toFixed(0)}M`
                : token.amount >= 1000
                ? `${(token.amount / 1000).toFixed(0)}K`
                : token.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })
              : "0"
            } {token.symbol}
          </p>
        </div>
      </td>

      {/* MENU */}
      <td className="px-4 py-4">
        <button
          onClick={onMenuClick}
          className="p-1 hover:bg-white/10 rounded transition"
        >
          <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default function TokensPage() {
  const { walletAddress, isConnected, isConnecting, connect } = useWallet();
  const { data: solanaAccount, isLoading: accountLoading } = useSolanaAccount(
    walletAddress ?? null
  );
  const { tokens, isLoading: portfolioLoading } = usePortfolio();
  const { data: solPrice } = useSolPrice();

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  // Calculate total value
  const totalValue = tokens.reduce((sum, token) => sum + token.usd, 0);
  const totalChange = "-0.50%"; // This would come from price API in production

  // Add SOL to tokens if we have SOL balance
  const allTokens: Token[] = [];
  if (solanaAccount && solPrice) {
    const solBalance = solanaAccount.balanceSol;
    const solUsd = solBalance * solPrice;
    allTokens.push({
      id: "So11111111111111111111111111111111111111112",
      name: "Solana",
      symbol: "SOL",
      amount: solBalance,
      usd: solUsd,
      change: "-0.50%",
      price: solPrice,
    });
  }
  allTokens.push(...tokens.map(t => ({
    ...t,
    change: t.change || "",
    price: t.symbol === "SOL" ? solPrice || undefined : undefined,
  })));

  const showLoading = isConnecting || portfolioLoading || accountLoading;

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
                Connect Wallet to View Tokens
              </h2>
              <p className="mt-4 text-base leading-7 text-white/70">
                Connect your Solana wallet to view your token holdings and balances.
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
      <LoadingOverlay show={showLoading} message="Loading tokens..." />
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Tokens</h1>
        
        <div className="flex items-center gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const solToken = allTokens.find(t => t.symbol === "SOL");
                if (solToken) {
                  setSelectedToken(solToken);
                  setSendModalOpen(true);
                }
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Send
            </button>
            <button
              onClick={() => {
                setSelectedToken({ id: "SOL", name: "Solana", symbol: "SOL", amount: 0, usd: 0 });
                setReceiveModalOpen(true);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Receive
            </button>
            
          </div>

          {/* Settings */}
          <button className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Wallet Info */}
          {walletAddress && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-semibold text-blue-400">
                {walletAddress.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">Wallet</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-white/60 font-mono">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition"
                  >
                    <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Total Value Section */}
      <div className="mb-6">
        <p className="text-xs text-white/60 mb-1">TOTAL VALUE</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl sm:text-4xl font-bold text-white">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm font-medium text-red-400">{totalChange}</p>
        </div>
      </div>

      {/* Tokens Table */}
      <div className="rounded-2xl border border-white/10 bg-[#111118] overflow-hidden">
        {portfolioLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/60">Loading tokens...</p>
          </div>
        ) : allTokens.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-white/60">No tokens found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">NAME</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">PRICE/24H CHANGE</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">BALANCE</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {allTokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onMenuClick={() => {
                      // Handle menu click - could open a dropdown with options
                      console.log("Menu clicked for", token.symbol);
                    }}
                  />
                ))}
              </tbody>
            </table>
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
          tokenMint={selectedToken?.id !== "SOL" ? selectedToken?.id : undefined}
        />
      )}

      {/* Send Modal */}
      <SendModal
        isOpen={sendModalOpen}
        onClose={() => {
          setSendModalOpen(false);
          setSelectedToken(null);
        }}
        token={selectedToken ? {
          symbol: selectedToken.symbol,
          amount: selectedToken.amount,
          id: selectedToken.id,
        } : undefined}
      />
    </>
  );
}
