"use client";

import { useWallet } from "../../../hooks/useWallet";
import { useTransactionHistory, type Transaction } from "../../../hooks/useTransactionHistory";
import { useAtomValue } from "jotai";
import { networkAtom } from "../../../lib/state";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface ParsedTransaction {
  type: string;
  details: string;
  result: string;
  resultAmount: number | null;
  isPositive: boolean;
  date: Date;
  signature: string;
}

function parseTransaction(tx: Transaction, walletAddress: string): ParsedTransaction {
  const date = new Date(tx.blockTime * 1000);
  let type = "Unknown";
  let details = "Unknown";
  let result = "";
  let resultAmount: number | null = null;
  let isPositive = false;

  // Extract fee from transaction
  const fee = tx.meta?.fee || tx.fee || 0;
  const feeSol = fee / LAMPORTS_PER_SOL;

  // Try to parse transaction instructions
  const transaction = tx.transaction;
  const instructions = transaction?.message?.instructions || [];

  // Handle both legacy and versioned transactions
  let accountKeys: string[] = [];
  if (transaction?.message) {
    if ('accountKeys' in transaction.message) {
      // Legacy transaction
      const legacyKeys = transaction.message.accountKeys as any[];
      accountKeys = legacyKeys.map((key: any) => {
        if (typeof key === "string") {
          return key;
        } else if (key?.pubkey) {
          return typeof key.pubkey === "string" ? key.pubkey : key.pubkey.toBase58?.() || "";
        } else if (key?.toBase58) {
          return key.toBase58();
        }
        return "";
      }).filter((k: string) => k !== "");
    } else if ('getAccountKeys' in transaction.message) {
      // Versioned transaction (MessageV0)
      try {
        accountKeys = transaction.message.getAccountKeys().staticAccountKeys.map((k: any) =>
          typeof k === "string" ? k : k.toBase58?.() || ""
        );
      } catch (e) {
        console.warn("Error extracting account keys from versioned transaction:", e);
      }
    }
  }

  // Find wallet address index
  const walletIndex = accountKeys.findIndex((key: string) => key === walletAddress);

  // Check for token transfers
  const tokenTransfers = tx.meta?.postTokenBalances || [];
  const preTokenBalances = tx.meta?.preTokenBalances || [];

  // Check for SOL transfers
  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];

  if (walletIndex >= 0 && preBalances[walletIndex] !== undefined && postBalances[walletIndex] !== undefined) {
    const balanceChange = (postBalances[walletIndex] - preBalances[walletIndex]) / LAMPORTS_PER_SOL;

    if (Math.abs(balanceChange) > 0.0001) {
      resultAmount = Math.abs(balanceChange);
      isPositive = balanceChange > 0;

      if (balanceChange > 0) {
        type = "Received";
        // Try to find sender
        const senderIndex = preBalances.findIndex(
          (bal: number, idx: number) => idx !== walletIndex && bal > postBalances[idx]
        );
        if (senderIndex >= 0 && accountKeys[senderIndex]) {
          const senderAddress = accountKeys[senderIndex];
          details = `${senderAddress.slice(0, 4)}...${senderAddress.slice(-4)} → ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        } else {
          details = "Unknown → " + walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4);
        }
        result = `+${resultAmount.toFixed(2)} SOL`;
      } else {
        type = "Sent";
        // Try to find recipient
        const recipientIndex = postBalances.findIndex(
          (bal: number, idx: number) => idx !== walletIndex && bal > preBalances[idx]
        );
        if (recipientIndex >= 0 && accountKeys[recipientIndex]) {
          const recipientAddress = accountKeys[recipientIndex];
          details = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} → ${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}`;
        } else {
          details = walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4) + " → Unknown";
        }
        result = `-${resultAmount.toFixed(2)} SOL`;
      }
    } else if (fee > 0) {
      // Small fee transaction
      resultAmount = feeSol;
      isPositive = false;
      result = `-<${feeSol.toFixed(2)} SOL`;

      // Check if it's a token account creation
      if (instructions.some((ix: any) =>
        ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" ||
        (typeof ix.programId === "object" && ix.programId?.toBase58?.() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      )) {
        type = "Created token account";
        details = "Unknown (Unknown)";
      } else {
        type = "App interaction";
        details = "Unknown";
      }
    }
  }

  // Check for token transfers
  if (tokenTransfers.length > 0 || preTokenBalances.length > 0) {
    const tokenChange = tokenTransfers.reduce((sum: number, post: any) => {
      const pre = preTokenBalances.find((p: any) => p.accountIndex === post.accountIndex);
      const postAmount = parseFloat(post.uiTokenAmount?.uiAmountString || "0");
      const preAmount = pre ? parseFloat(pre.uiTokenAmount?.uiAmountString || "0") : 0;
      return sum + (postAmount - preAmount);
    }, 0);

    if (Math.abs(tokenChange) > 0) {
      const tokenInfo = tokenTransfers[0]?.mint || preTokenBalances[0]?.mint;
      const tokenSymbol = tokenInfo ? tokenInfo.slice(0, 4) + "..." + tokenInfo.slice(-4) : "Unknown";

      if (tokenChange > 0) {
        type = "Received";
        details = `Unknown → ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        result = `+${Math.abs(tokenChange).toLocaleString()} ${tokenSymbol}`;
        isPositive = true;
      } else {
        type = "Sent";
        details = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} → Unknown`;
        result = `-${Math.abs(tokenChange).toLocaleString()} ${tokenSymbol}`;
        isPositive = false;
      }
    }
  }

  // Check for staking transactions
  if (instructions.some((ix: any) => {
    const programId = typeof ix.programId === "string"
      ? ix.programId
      : ix.programId?.toBase58?.();
    return programId === "Stake11111111111111111111111111111111111111";
  })) {
    if (type === "Received" && resultAmount && resultAmount > 0) {
      type = "Withdrew SOL";
      details = "Withdrew staked SOL";
    } else if (type === "Sent") {
      type = "Unstaked SOL";
      details = "Unstaked SOL";
      result = "";
    }
  }

  return {
    type,
    details,
    result,
    resultAmount,
    isPositive,
    date,
    signature: tx.signature,
  };
}

function TransactionRow({ transaction, walletAddress, network }: { transaction: Transaction; walletAddress: string; network: string }) {
  const parsed = parseTransaction(transaction, walletAddress);
  const formattedDate = parsed.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: parsed.date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });

  // Generate explorer link
  const clusterParam = network === "mainnet-beta" ? "mainnet" : network;
  const explorerLink = `https://solscan.io/tx/${parsed.signature}?cluster=${clusterParam}`;

  // Determine highlight color based on transaction type
  const getTypeHighlight = () => {
    if (parsed.type === "Received" || parsed.type === "Withdrew SOL") {
      return "hover:bg-green-500/10 border-l-2 border-l-green-500/30 hover:border-l-green-500/60";
    } else if (parsed.type === "Sent") {
      return "hover:bg-red-500/10 border-l-2 border-l-red-500/30 hover:border-l-red-500/60";
    } else if (parsed.type === "Created token account" || parsed.type === "App interaction") {
      return "hover:bg-blue-500/10 border-l-2 border-l-blue-500/30 hover:border-l-blue-500/60";
    }
    return "hover:bg-white/5 border-l-2 border-l-white/10 hover:border-l-white/20";
  };

  return (
    <tr className={`border-b border-white/10 transition group ${getTypeHighlight()}`}>
      <td className="px-4 py-3 text-sm text-white/70 group-hover:text-white transition">{formattedDate}</td>
      <td className="px-4 py-3 text-sm text-white group-hover:text-blue-300 transition">
        <span className="inline-flex items-center gap-2">
          {parsed.type}
          {parsed.isPositive && (
            <span className="w-2 h-2 rounded-full bg-green-400 opacity-60 group-hover:opacity-100 transition"></span>
          )}
          {!parsed.isPositive && parsed.result && (
            <span className="w-2 h-2 rounded-full bg-red-400 opacity-60 group-hover:opacity-100 transition"></span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-white/70">
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex items-center gap-1.5 hover:text-blue-400 transition font-medium"
          title="View on Solscan"
        >
          <span className="underline decoration-blue-400/50 group-hover/link:decoration-blue-400 group-hover/link:text-blue-400">
            {parsed.details}
          </span>
          <svg className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover/link:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {parsed.result ? (
          <a
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`group/link flex items-center justify-end gap-1.5 hover:underline transition font-semibold ${parsed.isPositive ? "text-green-400 hover:text-green-300" : "text-white hover:text-blue-300"}`}
            title="View on Solscan"
          >
            <span>{parsed.result}</span>
            <svg className={`w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition ${parsed.isPositive ? "text-green-400" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <a
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center justify-end gap-1.5 text-white/40 hover:text-blue-400 transition font-medium"
            title="View on Solscan"
          >
            <span className="hover:underline">View</span>
            <svg className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover/link:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </td>
    </tr>
  );
}

export default function TransactionsPage() {
  const { walletAddress, isConnected, isConnecting, connect } = useWallet();
  const network = useAtomValue(networkAtom);
  const { transactions, isLoading, isError, error } = useTransactionHistory({
    limit: 100,
    sortOrder: "desc",
    enabled: isConnected && Boolean(walletAddress),
  });

  if (!isConnected) {
    return (
      <>
        <LoadingOverlay show={isConnecting} message="Connecting Wallet..." />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-white/10 bg-[#001229] p-8 sm:p-12 text-center">
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
                Connect Wallet to View Activity
              </h2>
              <p className="mt-4 text-base leading-7 text-white/70">
                Connect your Solana wallet to view your transaction history and activity.
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
      <LoadingOverlay show={isConnecting} message="Connecting Wallet..." />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Activity</h1>

        {/* Wallet Info */}
        {walletAddress && (
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
              <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-white/10 bg-[#001229] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/60">Loading transactions...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-400">Error loading transactions: {error?.message || "Unknown error"}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-white/60">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">DATE</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">TYPE</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">DETAILS</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">TRANSACTION RESULT</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <TransactionRow key={tx.signature} transaction={tx} walletAddress={walletAddress || ""} network={network} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
