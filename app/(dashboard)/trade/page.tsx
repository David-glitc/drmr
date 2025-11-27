"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

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

  return (
    <>
      <header className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur sm:px-8 sm:py-8">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
          Trade
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Swap DRMR / SOL
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          A simulated DEX interface with a live price trend chart. Hook it up to
          your favorite Solana aggregator when ready.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">You send</label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3">
                <input
                  type="number"
                  value={sendValue}
                  onChange={(event) => setSendValue(event.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-xl font-semibold text-white outline-none placeholder:text-slate-500"
                />
                <span className="text-sm font-semibold text-white">SOL</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300">You receive</label>
              <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xl font-semibold text-white">
                {Number(sendValue || 0 * 7).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                DRMR
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400">
                Execute swap
              </button>
              <button className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white">
                Limit order
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Slippage Guard</span>
                <span className="text-white">0.50%</span>
              </div>
              <div className="flex justify-between">
                <span>Route</span>
                <span className="text-white">Orca → Meteora</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement</span>
                <span className="text-white">~2s finality</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
            DRMR Price
          </p>
          <div className="mt-4 h-48 sm:mt-6 sm:h-64">
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

