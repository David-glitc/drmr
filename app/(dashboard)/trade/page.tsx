"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useJupiterQuote } from "../../../hooks/useJupiterQuote";
import { TOKEN_MINTS } from "../../../lib/services/jupiter-service";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ChartSkeleton } from "../../../components/Skeletons";

const DRMR_MINT = "YOUR_DRMR_MINT_ADDRESS_HERE";

const priceSeries = [
  { label: "9:00", value: 0.061 },
  { label: "10:00", value: 0.064 },
  { label: "11:00", value: 0.066 },
  { label: "12:00", value: 0.067 },
  { label: "13:00", value: 0.065 },
  { label: "14:00", value: 0.068 },
];

export default function TradePage() {
  const [sendValue, setSendValue] = useState("");
  
  const solAmountLamports = useMemo(() => {
    if (!sendValue || parseFloat(sendValue) <= 0) return "0";
    return Math.floor(parseFloat(sendValue) * LAMPORTS_PER_SOL).toString();
  }, [sendValue]);

  const { data: quote, isLoading: isQuoteLoading } = useJupiterQuote({
    inputMint: TOKEN_MINTS.SOL,
    outputMint: DRMR_MINT || TOKEN_MINTS.USDC,
    amount: solAmountLamports,
    slippageBps: 50,
    enabled: parseFloat(sendValue) > 0 && !!DRMR_MINT,
  });

  const outputAmount = useMemo(() => {
    if (!quote?.outAmount) return "0.00";
    const decimals = 6;
    return (parseInt(quote.outAmount) / Math.pow(10, decimals)).toFixed(2);
  }, [quote]);

  const priceImpact = quote?.priceImpactPct 
    ? parseFloat(quote.priceImpactPct).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Trade</h1>
        <p className="text-xs sm:text-sm text-white/60">
          Powered by Jupiter Aggregator. Get the best swap rates across all Solana DEXs.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Swap Interface */}
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
          <div className="space-y-4">
            {/* You Send */}
            <div>
              <label className="text-sm text-white/70 mb-2 block">You send</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3">
                <input
                  type="number"
                  value={sendValue}
                  onChange={(e) => setSendValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-white/40"
                />
                <span className="text-sm font-semibold text-white">SOL</span>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <div className="rounded-full border border-white/10 bg-[#0a0a0f] p-2">
                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>

            {/* You Receive */}
            <div>
              <label className="text-sm text-white/70 mb-2 block">You receive</label>
              <div className="rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-lg font-semibold text-white">
                {isQuoteLoading ? (
                  <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
                ) : (
                  <>
                    {Number(outputAmount).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                      minimumFractionDigits: 2,
                    })}{" "}
                    DRMR
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                disabled={!quote || isQuoteLoading || parseFloat(sendValue) <= 0}
                className="rounded-xl bg-red-500 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isQuoteLoading ? "Loading..." : "Execute swap"}
              </button>
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10">
                Limit order
              </button>
            </div>

            {/* Swap Details */}
            <div className="rounded-xl border border-white/10 bg-[#0a0a0f] p-4 space-y-2 text-xs text-white/70">
              <div className="flex justify-between">
                <span>Slippage Guard</span>
                <span className="text-white">0.50%</span>
              </div>
              {quote && (
                <>
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span className={parseFloat(priceImpact) > 1 ? "text-red-400" : "text-white"}>
                      {priceImpact}%
                    </span>
                  </div>
                  {quote.routePlan && quote.routePlan.length > 0 && (
                    <div className="flex justify-between">
                      <span>Route</span>
                      <span className="text-white">
                        {quote.routePlan.length} hop{quote.routePlan.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span>Settlement</span>
                <span className="text-white">~2s finality</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
          <p className="text-xs text-white/60 mb-4">DRMR Price</p>
          <div className="h-40 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceSeries}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ef4444"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
