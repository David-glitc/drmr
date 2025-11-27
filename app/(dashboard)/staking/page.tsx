"use client";

import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useAnalytics } from "../../../hooks/useAnalytics";
import { useStaking } from "../../../hooks/useStaking";

const fallbackAllocation = [
  { label: "SOL Stakers", value: 54, fill: "#38bdf8" },
  { label: "DRMR Stakers", value: 38, fill: "#f43f5e" },
  { label: "Idle Liquidity", value: 8, fill: "#fbbf24" },
];

const fallbackApy = [
  { epoch: "Week 1", apy: 7.4 },
  { epoch: "Week 2", apy: 7.6 },
  { epoch: "Week 3", apy: 7.8 },
  { epoch: "Week 4", apy: 8.1 },
];

export default function StakingPage() {
  const { allocation } = useAnalytics();
  const { activePool, poolConfig, estimatedRewards, switchPool, estimateRewards } =
    useStaking();

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80 sm:text-sm">
              Epoch Control
            </p>
            <h1 className="text-2xl font-semibold text-white sm:text-4xl">
              Staking Performance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Inspect pool APYs, allocations, and simulate rewards with live
              Recharts visualizations.
            </p>
          </div>
          <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs sm:text-sm">
            {(["SOL", "DRMR"] as const).map((option) => (
              <button
                key={option}
                onClick={() => switchPool(option)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activePool === option
                    ? "bg-white text-slate-900"
                    : "text-slate-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
          <p className="text-sm text-slate-400">APY preview</p>
          <h3 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            {poolConfig.apy}
          </h3>
          <p className="text-sm text-slate-400">{poolConfig.epoch}</p>
          <p className="mt-4 text-sm text-slate-300">
            {poolConfig.description}
          </p>

          <div className="mt-6 rounded-2xl bg-rose-500/10 p-4 text-sm">
            <p className="text-rose-200">TVL {poolConfig.tvl}</p>
            <p className="text-slate-200">
              Rewards accrue daily and can be claimed every epoch with a single
              transaction.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300 sm:text-sm">
              Reward simulator
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => estimateRewards(activePool, amount)}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-rose-400/50"
                >
                  {amount.toLocaleString()} {activePool}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Estimated epoch rewards:{" "}
              <span className="text-white">{estimatedRewards}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
              APY History
            </p>
            <div className="mt-4 h-48 sm:mt-6 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fallbackApy}>
                  <defs>
                    <linearGradient id="apy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="apy"
                    stroke="#38bdf8"
                    fill="url(#apy)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
              Allocation Mix
            </p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="h-48 w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Pie
                      data={
                        allocation.length
                          ? allocation.map((slice, index) => ({
                              label: slice.label,
                              value: slice.percent,
                              fill: fallbackAllocation[index % fallbackAllocation.length].fill,
                            }))
                          : fallbackAllocation
                      }
                      dataKey="value"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={80}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3 text-sm text-slate-300">
                {(allocation.length
                  ? allocation
                  : fallbackAllocation.map(({ label, value }) => ({
                      label,
                      percent: value,
                    }))
                ).map((slice) => (
                  <div key={slice.label} className="flex justify-between">
                    <span>{slice.label}</span>
                    <span className="text-white">{slice.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

