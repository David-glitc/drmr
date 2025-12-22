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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Tokens</h1>
        <p className="text-xs sm:text-sm text-white/60">
          Monitor circulating supply, secondary indexes, and view a live bar chart comparing treasury allocations across DRMR primitives.
        </p>
      </div>

      {/* Token Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tokenCards.map((token) => (
          <div
            key={token.label}
            className="rounded-xl border border-white/10 bg-[#111118] p-4"
          >
            <div className="flex items-center justify-between text-xs text-white/60 mb-3">
              <span>{token.label}</span>
              <span>{token.supply}</span>
            </div>
            <p className="text-2xl font-semibold text-white mb-1">
              {token.price}
            </p>
            <p className={`text-sm font-medium ${
              token.change.startsWith("+") ? "text-green-400" : "text-red-400"
            }`}>
              {token.change}
            </p>
          </div>
        ))}
      </div>

      {/* Supply Chart */}
      <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-xs text-white/60 mb-1">Supply chart</p>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            Bar distribution via Recharts
          </h3>
        </div>
        <div className="h-48 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supplyData}>
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
