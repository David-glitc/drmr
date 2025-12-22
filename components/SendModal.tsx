"use client";

import { useState, useCallback } from "react";
import { useWallet } from "../hooks/useWallet";
import { useSolPrice } from "../hooks/useSolPrice";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: {
    symbol: string;
    amount: number;
    id?: string;
  };
}

export function SendModal({
  isOpen,
  onClose,
  token,
}: SendModalProps) {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendSol, isConnected } = useWallet();
  const { data: solPrice } = useSolPrice();

  const tokenSymbol = token?.symbol || "SOL";
  const tokenAmount = token?.amount || 0;

  const setPercentage = useCallback((percent: number) => {
    const value = (tokenAmount * percent) / 100;
    setAmount(value.toFixed(9).replace(/\.?0+$/, ""));
  }, [tokenAmount]);

  const setMax = useCallback(() => {
    setAmount(tokenAmount.toFixed(9).replace(/\.?0+$/, ""));
  }, [tokenAmount]);

  const amountUsd =
    tokenSymbol === "SOL" && solPrice && amount
      ? parseFloat(amount) * solPrice
      : null;

  const handleSend = async () => {
    if (!isConnected || !amount || !recipient) return;

    try {
      setIsSending(true);
      if (tokenSymbol === "SOL") {
        await sendSol(recipient, parseFloat(amount));
      }
      // Reset form
      setAmount("");
      setRecipient("");
      onClose();
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111118] p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Send {tokenSymbol}</h2>
            <p className="text-sm text-white/60">
              Send {tokenSymbol} to any Solana address
            </p>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
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
                className="flex-1 bg-transparent text-lg sm:text-xl font-semibold text-white outline-none placeholder:text-white/40"
              />
              <span className="text-sm sm:text-base font-semibold text-white/70">
                {tokenSymbol}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              {amount && (
                <p className="text-xs text-white/50">
                  Max: {tokenAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 9,
                  })}
                </p>
              )}
              {amountUsd && (
                <p className="text-xs sm:text-sm text-blue-400">
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

          {/* Recipient Address */}
          <div className="mb-6">
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

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!amount || !recipient || isSending || !isConnected}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>

          {!isConnected && (
            <p className="mt-4 text-center text-xs text-red-400">
              Please connect your wallet to send
            </p>
          )}
        </div>
      </div>
    </>
  );
}

