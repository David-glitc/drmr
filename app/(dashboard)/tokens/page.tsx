"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supplyData = [
  { label: "DRMR", value: 1200 },
  { label: "DRMRx", value: 260 },
  { label: "SolBONUS", value: 42 },
  { label: "ValidatorPts", value: 18 },
];

const tokenCards = [
  { label: "DRMR", supply: "1.2B", price: "$0.068", change: "+14%" },
  { label: "DRMRx", supply: "260M", price: "$0.21", change: "+4%" },
  { label: "SolBONUS", supply: "42M", price: "$1.02", change: "-2%" },
];

export default function TokensPage() {
  return (
    <>
      <header className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
          Tokens
        </p>
        <h1 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
          DRMR Ecosystem Assets
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Monitor circulating supply, secondary indexes, and view a live bar
          chart comparing treasury allocations across DRMR primitives.
        </p>
      </header>

      <section className="grid gap-2 sm:gap-3 md:grid-cols-3">
        {tokenCards.map((token) => (
          <div
            key={token.label}
            className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
              <span>{token.label}</span>
              <span>{token.supply}</span>
            </div>
            <p className="mt-2.5 text-2xl font-semibold text-white">
              {token.price}
            </p>
            <p className="text-xs text-rose-300">{token.change}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
              Supply chart
            </p>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Bar distribution via Recharts
            </h3>
          </div>
        </div>
        <div className="mt-3 h-48 sm:mt-4 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supplyData}>
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

