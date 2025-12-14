"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useJupiterQuote } from "@/hooks/useJupiterQuote";
import { TOKEN_MINTS } from "@/lib/services/jupiter-service";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// TODO: Replace with actual DRMR mint address when available
const DRMR_MINT = "YOUR_DRMR_MINT_ADDRESS_HERE";

// Mock price series data - TODO: Replace with real price data from Jupiter or other price API
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
  
  // Convert SOL amount to lamports for Jupiter API
  const solAmountLamports = useMemo(() => {
    if (!sendValue || parseFloat(sendValue) <= 0) return "0";
    return Math.floor(parseFloat(sendValue) * LAMPORTS_PER_SOL).toString();
  }, [sendValue]);

  // Fetch quote from Jupiter
  const { data: quote, isLoading: isQuoteLoading } = useJupiterQuote({
    inputMint: TOKEN_MINTS.SOL,
    outputMint: DRMR_MINT || TOKEN_MINTS.USDC, // Fallback to USDC if DRMR not set
    amount: solAmountLamports,
    slippageBps: 50, // 0.5% slippage
    enabled: parseFloat(sendValue) > 0 && !!DRMR_MINT,
  });

  // Calculate output amount
  const outputAmount = useMemo(() => {
    if (!quote?.outAmount) return "0.00";
    // TODO: Get DRMR decimals (typically 6 or 9)
    const decimals = 6;
    return (parseInt(quote.outAmount) / Math.pow(10, decimals)).toFixed(2);
  }, [quote]);

  const priceImpact = quote?.priceImpactPct 
    ? parseFloat(quote.priceImpactPct).toFixed(2)
    : "0.00";

  return (
    <>
      <header className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
          Trade
        </p>
        <h1 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
          Swap DRMR / SOL
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Powered by Jupiter Aggregator. Get the best swap rates across all Solana DEXs.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300">You send</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5">
                <input
                  type="number"
                  value={sendValue}
                  onChange={(event) => setSendValue(event.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-500"
                />
                <span className="text-xs font-semibold text-white">SOL</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-300">You receive</label>
              <div className="mt-1.5 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-lg font-semibold text-white">
                {isQuoteLoading ? (
                  <span className="text-slate-400">Calculating...</span>
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
            <div className="grid grid-cols-2 gap-2">
              <button 
                disabled={!quote || isQuoteLoading || parseFloat(sendValue) <= 0}
                className="cursor-pointer rounded-xl bg-rose-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isQuoteLoading ? "Loading..." : "Execute swap"}
              </button>
              <button className="cursor-pointer rounded-xl border border-white/20 px-3 py-2.5 text-xs font-semibold text-white transition hover:border-white">
                Limit order
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Slippage Guard</span>
                <span className="text-white">0.50%</span>
              </div>
              {quote && (
                <>
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span className={parseFloat(priceImpact) > 1 ? "text-rose-400" : "text-white"}>
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

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
            DRMR Price
          </p>
          <div className="mt-3 h-40 sm:mt-4 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceSeries}>
                <defs>
                  <linearGradient id="price" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f43f5e"
                  fill="url(#price)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </>
  );
}

