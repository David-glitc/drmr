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
      <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80 sm:text-xs">
              Epoch Control
            </p>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">
              Staking Performance
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
              Inspect pool APYs, allocations, and simulate rewards with live
              Recharts visualizations.
            </p>
          </div>
          <div className="flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1 text-[10px] sm:text-xs">
            {(["SOL", "DRMR"] as const).map((option) => (
              <button
                key={option}
                onClick={() => switchPool(option)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition ${
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

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <p className="text-xs text-slate-400">APY preview</p>
          <h3 className="mt-1.5 text-2xl font-semibold text-white sm:text-3xl">
            {poolConfig.apy}
          </h3>
          <p className="text-xs text-slate-400">{poolConfig.epoch}</p>
          <p className="mt-3 text-xs text-slate-300">
            {poolConfig.description}
          </p>

          <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs">
            <p className="text-rose-200">TVL {poolConfig.tvl}</p>
            <p className="text-slate-200">
              Rewards accrue daily and can be claimed every epoch with a single
              transaction.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-300 sm:text-xs">
              Reward simulator
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => estimateRewards(activePool, amount)}
                  className="cursor-pointer rounded-xl border border-white/10 px-3 py-2 text-left text-xs font-semibold text-white transition hover:border-rose-400/50"
                >
                  {amount.toLocaleString()} {activePool}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Estimated epoch rewards:{" "}
              <span className="text-white">{estimatedRewards}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
              APY History
            </p>
            <div className="mt-3 h-40 sm:mt-4 sm:h-48">
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

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
              Allocation Mix
            </p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="h-40 w-full lg:w-1/2">
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
                      innerRadius={40}
                      outerRadius={65}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 text-xs text-slate-300">
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

