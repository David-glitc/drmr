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
      <header className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur sm:px-8 sm:py-8">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
          Tokens
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          DRMR Ecosystem Assets
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          Monitor circulating supply, secondary indexes, and view a live bar
          chart comparing treasury allocations across DRMR primitives.
        </p>
      </header>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {tokenCards.map((token) => (
          <div
            key={token.label}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>{token.label}</span>
              <span>{token.supply}</span>
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">
              {token.price}
            </p>
            <p className="text-sm text-rose-300">{token.change}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
              Supply chart
            </p>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">
              Bar distribution via Recharts
            </h3>
          </div>
        </div>
        <div className="mt-4 h-56 sm:mt-6 sm:h-72">
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

