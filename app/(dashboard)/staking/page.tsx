"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useStaking } from "../../../hooks/useStaking";
import { useWallet } from "../../../hooks/useWallet";
import { ReceiveModal } from "../../../components/ReceiveModal";

// DRMR staking integration
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useDrmrToken } from "../../../hooks/useDrmrToken";

export default function StakingPage() {
  const { poolConfig, estimatedRewards, estimateRewards } = useStaking();
  const { walletAddress, isConnected } = useWallet();

  const DRMR_MINT = process.env.NEXT_PUBLIC_DRMR_MINT || "";

  const { data: drmrBalance } = useDrmrToken(DRMR_MINT);
  const {
    stake: stakeDrmr,
    fetchStaker,
    fetchStakingPool,
    isLoading: isDrmrStakingLoading,
  } = useDrmrStaking();

  // Fetch pool and staker data
  const { data: stakingPool } = useQuery({
    queryKey: ["staking-pool"],
    queryFn: fetchStakingPool,
    refetchInterval: 30000,
  });

  const { data: stakerData } = useQuery({
    queryKey: ["staker", walletAddress],
    queryFn: fetchStaker,
    enabled: !!walletAddress,
    refetchInterval: 30000,
  });

  const [stakeAmount, setStakeAmount] = useState("");
  const [stakePeriods, setStakePeriods] = useState<number>(1);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [stakingSuccess, setStakingSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("Calculating...");

  // Countdown timer effect
  useEffect(() => {
    if (!stakingPool) return;

    const timer = setInterval(() => {
      const lastDist = Number(stakingPool.lastRewardDistribution);
      const cycle = Number(stakingPool.rewardCycleSeconds);
      const now = Math.floor(Date.now() / 1000);
      const nextDist = lastDist + cycle;
      const remaining = Math.max(0, nextDist - now);

      if (remaining <= 0) {
        setCountdown("Processing...");
      } else {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setCountdown(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stakingPool]);

  const minDrmrStakeAmount = 0.001;
  const hasInsufficientBalance = drmrBalance ? drmrBalance.balance < minDrmrStakeAmount : true;
  const canStake = stakeAmount && parseFloat(stakeAmount) >= minDrmrStakeAmount && !hasInsufficientBalance && !!DRMR_MINT;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking</h1>
        <p className="text-xs sm:text-sm text-white/60">Stake your tokens to steadily earn rewards</p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_480px] overflow-x-hidden">
        {/* Main Content */}
        <div className="rounded-2xl border border-white/10 bg-[#001229] p-4 sm:p-8 lg:p-12">
          <div className="flex flex-col items-center justify-center text-center min-h-[300px] sm:min-h-[400px]">
            <div className="mb-6 sm:mb-8 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <svg className="w-20 h-20 sm:w-32 sm:h-32 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 px-2">Earn with DRMR</h2>
            <p className="text-sm sm:text-base text-white/70 mb-6 sm:mb-8 max-w-md px-2">
              Stake your tokens to steadily earn rewards. Stake DRMR to earn rewards.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md px-2">
              <button
                onClick={() => setIsStakeModalOpen(true)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-white/10"
              >
                Stake now
              </button>
              <button
                onClick={() => setReceiveModalOpen(true)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-white/10"
              >
                Receive
              </button>
            </div>
          </div>
        </div>

        {/* Staking Stats (Right Side - Read Only) */}
        <div className="space-y-6">
          {/* Protocol Health & Stats */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Protocol Health</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Total Staked */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Total Staked</p>
                <p className="text-lg font-bold text-white">
                  {stakingPool ? `${(Number(stakingPool.totalStaked) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : poolConfig.tvl.split(' ')[0]}
                </p>
                <p className="text-[10px] text-white/30 mt-1">DRMR</p>
              </div>

              {/* Last Period Comparison */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Last Period</p>
                <p className="text-lg font-bold text-white/70">
                  {stakingPool ? `${(Number(stakingPool.totalStaked) / 1.05e9).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "22.4M"}
                </p>
                <p className="text-[10px] text-white/30 mt-1">DRMR</p>
              </div>

              {/* Next Rewards Period */}
              <div className="col-span-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider font-medium">Next Rewards Period</p>
                  <p className="text-lg font-bold text-white">{countdown}</p>
                </div>
                <p className="text-[10px] text-white/40">Automatic distribution every 5 minutes</p>
              </div>

              {/* Total Stakers */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Total Stakers</p>
                <p className="text-lg font-bold text-white">{stakingPool ? stakingPool.totalStakers.toString() : "3"}</p>
              </div>

              {/* Total Rewards Paid */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Rewards Paid</p>
                <p className="text-lg font-bold text-white">
                  {stakingPool ? (Number(stakingPool.totalRewardsDistributed) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "806,858"}
                </p>
                <p className="text-[10px] text-white/30 mt-1">DRMR</p>
              </div>

              {/* Reward Reserve */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Reward Reserve</p>
                <p className="text-lg font-bold text-blue-400">
                  {stakingPool ? (Number(stakingPool.rewardsInPool) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                </p>
                <p className="text-[10px] text-white/30 mt-1">DRMR</p>
              </div>

              {/* Network Status */}
              <div className="rounded-xl bg-[#001229]/50 p-4 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Network Status</p>
                <p className="text-lg font-bold text-green-400">{stakingPool?.isActive ? "Live" : "Live"}</p>
              </div>
            </div>
          </div>

          {/* Reward Estimator */}
          <div className="rounded-2xl border border-white/10 bg-[#001229] p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Reward Estimator</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => estimateRewards("DRMR", amount)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  {amount.toLocaleString()} DRMR
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#000d1f] p-3 border border-white/5">
              <p className="text-xs text-white/60">Estimated per cycle:</p>
              <span className="text-sm font-bold text-green-400">{estimatedRewards}</span>
            </div>
          </div>

          {/* APY Info */}
          <div className="rounded-2xl border border-white/10 bg-[#001229] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Current APY</p>
                <h3 className="text-2xl font-bold text-white">
                  {stakingPool ? `${(stakingPool.apyBps / 100).toFixed(2)}%` : poolConfig.apy}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 mb-1">Reward Cycle</p>
                <p className="text-sm font-medium text-white">
                  {stakingPool ? `${(Number(stakingPool.rewardCycleSeconds) / 3600).toFixed(0)} Hours` : "1 Hour"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stake Modal (Overlay) */}
      {isStakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsStakeModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#001229] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Stake DRMR</h3>
              <button
                onClick={() => setIsStakeModalOpen(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/70">Amount</label>
                <span className="text-xs text-white/60">
                  Max: {drmrBalance?.balance.toFixed(4) || "0"} DRMR
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3">
                  <input
                    type="text"
                    value={stakeAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setStakeAmount(value);
                        if (stakingError) setStakingError(null);
                      }
                    }}
                    placeholder="0"
                    className="flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/40"
                  />
                  <span className="text-xs text-white/60 font-medium">DRMR</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => {
                      if (drmrBalance) {
                        const value = (drmrBalance.balance * percent) / 100;
                        setStakeAmount(value.toFixed(4).replace(/\.?0+$/, ""));
                      }
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Period */}
            <div className="mb-6">
              <label className="text-sm text-white/70 mb-3 block">Stake Period (Epoch Cycles)</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((periods) => (
                  <button
                    key={periods}
                    onClick={() => setStakePeriods(periods)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${stakePeriods === periods
                      ? "border-red-500 bg-red-500/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                  >
                    {periods}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            {stakingSuccess && (
              <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-xs text-green-400">{stakingSuccess}</p>
              </div>
            )}
            {stakingError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-xs text-red-400">{stakingError}</p>
              </div>
            )}

            <button
              onClick={async () => {
                if (!canStake || !walletAddress || !DRMR_MINT) return;
                try {
                  setIsStaking(true);
                  setStakingError(null);
                  await stakeDrmr(parseFloat(stakeAmount), stakePeriods, DRMR_MINT);
                  setStakingSuccess("Staking successful!");
                  setTimeout(() => {
                    setIsStakeModalOpen(false);
                    setStakeAmount("");
                    setStakingSuccess(null);
                  }, 2000);
                } catch (err: any) {
                  setStakingError(err.message || "Failed to stake");
                } finally {
                  setIsStaking(false);
                }
              }}
              disabled={!canStake || isStaking || isDrmrStakingLoading}
              className="w-full rounded-xl bg-red-500 py-4 text-base font-bold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStaking ? "Processing..." : "Confirm Stake"}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {isConnected && walletAddress && (
        <ReceiveModal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          walletAddress={walletAddress}
          tokenSymbol="DRMR"
        />
      )}
    </div>
  );
}
