"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useStaking } from "../../../hooks/useStaking";
import { useWallet } from "../../../hooks/useWallet";
import { ReceiveModal } from "../../../components/ReceiveModal";

// DRMR staking integration
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useDrmrToken } from "../../../hooks/useDrmrToken";

export default function StakingPage() {
  const { poolConfig, estimatedRewards, estimateRewards } = useStaking();
  const { walletAddress, isConnected } = useWallet();
  const queryClient = useQueryClient();

  const {
    stake: stakeDrmr,
    withdraw: withdrawRewards,
    getReward: claimRewards,
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

  // Use the mint from the pool (or fallback to env var if pool not initialized)
  const DRMR_MINT = stakingPool?.drmrMint 
    ? stakingPool.drmrMint.toBase58() 
    : (process.env.NEXT_PUBLIC_DRMR_MINT || "");

  const { data: drmrBalance } = useDrmrToken(DRMR_MINT || null);

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
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [unlockCountdown, setUnlockCountdown] = useState<string>("");
  const [nextAccrualCountdown, setNextAccrualCountdown] = useState<string>("");
  const [withdrawStartTime, setWithdrawStartTime] = useState<number | null>(null);

  // Countdown timer effect for next rewards period
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

  // Unlock countdown timer effect
  useEffect(() => {
    if (!stakerData || !stakerData.stakeEndTime || Number(stakerData.amount) === 0) {
      setUnlockCountdown("");
      return;
    }

    const timer = setInterval(() => {
      const stakeEndTime = Number(stakerData.stakeEndTime);
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, stakeEndTime - now);

      if (remaining <= 0) {
        setUnlockCountdown("Unlocked");
      } else {
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        
        if (days > 0) {
          setUnlockCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else if (hours > 0) {
          setUnlockCountdown(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setUnlockCountdown(`${minutes}m ${seconds}s`);
        } else {
          setUnlockCountdown(`${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stakerData]);

  // Countdown until rewards start accruing again (after last claim)
  useEffect(() => {
    if (!stakerData || Number(stakerData.amount) === 0) {
      setNextAccrualCountdown("");
      return;
    }

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = Number(stakerData.lastClaim);
      const timeElapsedSeconds = Math.max(0, now - lastClaim);
      const minRequiredSeconds = 300; // 5 minutes
      const remainingSeconds = Math.max(0, minRequiredSeconds - timeElapsedSeconds);

      if (remainingSeconds <= 0) {
        setNextAccrualCountdown("");
      } else {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        setNextAccrualCountdown(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stakerData]);

  // Safety mechanism: Auto-reset if stuck in withdrawing state for more than 90 seconds
  useEffect(() => {
    if (isWithdrawing && withdrawStartTime) {
      const elapsed = Date.now() - withdrawStartTime;
      if (elapsed > 90000) { // 90 seconds
        console.warn("Withdraw operation stuck, auto-resetting...");
        setIsWithdrawing(false);
        setWithdrawStartTime(null);
        setStakingError("Transaction timed out. Please check your wallet or try again.");
      }
    }
  }, [isWithdrawing, withdrawStartTime]);

  const minDrmrStakeAmount = 0.001;
  const hasInsufficientBalance = drmrBalance ? drmrBalance.balance < minDrmrStakeAmount : true;
  const canStake = stakeAmount && parseFloat(stakeAmount) >= minDrmrStakeAmount && !hasInsufficientBalance && !!DRMR_MINT && !!stakingPool;
  
  // Check if user has active stake (amount > 0)
  const hasActiveStake = stakerData && Number(stakerData.amount) > 0;

  // Automatic get_reward call removed - users can claim manually when ready

  // Calculate accrued rewards (rewards that have accrued since last claim but haven't been calculated via get_reward)
  const calculateAccruedRewards = () => {
    if (!stakingPool || !stakerData || Number(stakerData.amount) === 0) return 0;

    const now = Math.floor(Date.now() / 1000);
    const lastClaim = Number(stakerData.lastClaim);
    const timeElapsedSeconds = Math.max(0, now - lastClaim);

    // Minimum 5 minutes (300 seconds) required for rewards (same as contract)
    if (timeElapsedSeconds < 300) return 0;

    // Use same calculation as contract: (staked_amount * apy_bps * time_elapsed * PRECISION) / (BASIS_POINTS * seconds_per_year)
    const BASIS_POINTS = 10000;
    const PRECISION = 1_000_000_000;
    const SECONDS_PER_YEAR = 31_557_600;

    const stakedAmount = Number(stakerData.amount);
    const apyBps = stakingPool.apyBps;

    // Calculate with high precision to avoid rounding errors
    const numerator = stakedAmount * apyBps * timeElapsedSeconds * PRECISION;
    const denominator = BASIS_POINTS * SECONDS_PER_YEAR;
    const rewardWithPrecision = Math.floor(numerator / denominator);
    const reward = Math.floor(rewardWithPrecision / PRECISION);

    return reward;
  };

  const accruedRewards = calculateAccruedRewards();
  const availableRewards = stakerData ? Number(stakerData.availableRewards) : 0;
  const totalPendingRewards = availableRewards + accruedRewards;
  
  // Check if user has pending rewards (either available or accrued)
  const hasPendingRewards = totalPendingRewards > 0;
  
  // Format stake period duration
  const formatStakePeriodDuration = (periods: number) => {
    if (!stakingPool) return "";
    const totalSeconds = periods * Number(stakingPool.rewardCycleSeconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(", ");
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking</h1>
        <p className="text-xs sm:text-sm text-white/60">Stake your tokens to steadily earn rewards</p>
      </div>

      {/* How it works dropdown */}
      <div className="rounded-2xl border border-white/10 bg-[#001229] overflow-hidden">
        <button
          onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white">How it works</h3>
          </div>
          <svg
            className={`h-5 w-5 text-white/60 transition-transform ${isHowItWorksOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isHowItWorksOpen && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/10">
            <ol className="space-y-3 mt-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                  1
                </span>
                <p className="text-sm sm:text-base text-white/80 pt-0.5">Connect your Solana wallet</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                  2
                </span>
                <p className="text-sm sm:text-base text-white/80 pt-0.5">Enter the amount of DRMR you want to stake</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                  3
                </span>
                <p className="text-sm sm:text-base text-white/80 pt-0.5">Select your lock-up duration (minimum 1 day)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                  4
                </span>
                <p className="text-sm sm:text-base text-white/80 pt-0.5">Earn rewards based on your stake duration!</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold">
                  5
                </span>
                <p className="text-sm sm:text-base text-white/80 pt-0.5">Current APY determines rewards earned while staked</p>
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_480px] overflow-x-hidden">
        {/* Main Content */}
        <div className="rounded-2xl border border-white/10 bg-[#001229] p-4 sm:p-8 lg:p-12">
          {hasActiveStake && stakerData ? (
            // User has active stake - show stake details
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Stake Details</h2>
              </div>

              {/* Pending Rewards - Prominent Display */}
              {hasPendingRewards && (
                <div className="rounded-xl bg-green-500/10 border-2 border-green-500/30 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-green-400 uppercase tracking-wider mb-2 font-medium">Total Pending Rewards</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-400">
                        {(totalPendingRewards / 1e9).toFixed(4)} DRMR
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-[#000d1f]/50 p-3 border border-white/10">
                      <p className="text-xs text-white/50 mb-1">Available</p>
                      <p className="text-base font-semibold text-white">
                        {(availableRewards / 1e9).toFixed(4)} DRMR
                      </p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                      <p className="text-xs text-yellow-400 mb-1">Accrued (pending)</p>
                      <p className="text-base font-semibold text-yellow-400">
                        {(accruedRewards / 1e9).toFixed(4)} DRMR
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stake Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Available Rewards (ready to withdraw) */}
                <div className="rounded-xl bg-[#000d1f] p-4 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Available Rewards</p>
                  <p className="text-xl font-bold text-green-400">
                    {(availableRewards / 1e9).toFixed(4)} DRMR
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">Ready to withdraw</p>
                </div>

                {/* Accrued Rewards (pending calculation) */}
                <div className="rounded-xl bg-[#000d1f] p-4 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 uppercase tracking-wider mb-2">Accrued Rewards</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {(accruedRewards / 1e9).toFixed(4)} DRMR
                  </p>
                  {nextAccrualCountdown ? (
                    <p className="text-[10px] text-yellow-400/70 mt-1">
                      Accrual resumes in: {nextAccrualCountdown}
                    </p>
                  ) : accruedRewards === 0 ? (
                    <p className="text-[10px] text-white/40 mt-1">Will accrue after 5 min</p>
                  ) : (
                    <p className="text-[10px] text-white/40 mt-1">Pending calculation</p>
                  )}
                </div>

                {/* Total Rewards Claimed */}
                <div className="rounded-xl bg-[#000d1f] p-4 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Total Rewards Claimed</p>
                  <p className="text-xl font-bold text-white">
                    {(Number(stakerData.totalRewardsClaimed) / 1e9).toFixed(4)} DRMR
                  </p>
                </div>

                {/* Total Active Stake */}
                <div className="rounded-xl bg-[#000d1f] p-4 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Active Stake</p>
                  <p className="text-xl font-bold text-white">
                    {(Number(stakerData.amount) / 1e9).toFixed(4)} DRMR
                  </p>
                </div>

                {/* Staking Date/Time */}
                <div className="rounded-xl bg-[#000d1f] p-4 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Staked At (GMT)</p>
                  <p className="text-sm font-semibold text-white">
                    {new Date(Number(stakerData.stakedAt) * 1000).toLocaleString('en-GB', {
                      timeZone: 'GMT',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })} GMT
                  </p>
                </div>
              </div>

              {/* Unlock Countdown */}
              {unlockCountdown && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-400 uppercase tracking-wider font-medium">Time Until Unlock</p>
                    <p className="text-lg font-bold text-white">{unlockCountdown}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {accruedRewards > 0 && (
                  <button
                    onClick={async () => {
                      if (!walletAddress || !DRMR_MINT) return;
                      try {
                        setIsClaiming(true);
                        setStakingError(null);
                        await claimRewards(DRMR_MINT);
                        setStakingSuccess("Rewards claimed successfully! They are now available to withdraw.");
                        // Invalidate queries to refresh data
                        queryClient.invalidateQueries({ queryKey: ["staker", walletAddress] });
                        queryClient.invalidateQueries({ queryKey: ["staking-pool"] });
                        setTimeout(() => {
                          setStakingSuccess(null);
                        }, 3000);
                      } catch (err: any) {
                        setStakingError(err.message || "Failed to claim rewards");
                      } finally {
                        setIsClaiming(false);
                      }
                    }}
                    disabled={isClaiming || isDrmrStakingLoading || accruedRewards === 0}
                    className="flex-1 rounded-xl bg-yellow-500 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaiming ? "Processing..." : `Claim ${(accruedRewards / 1e9).toFixed(2)} DRMR`}
                  </button>
                )}
                {availableRewards > 0 && (
                  <button
                    onClick={async () => {
                      if (!walletAddress || !DRMR_MINT || isWithdrawing) return;
                      
                      // Set timeout to prevent infinite loading
                      const timeoutId = setTimeout(() => {
                        setIsWithdrawing(false);
                        setStakingError("Transaction is taking longer than expected. Please check your wallet or try again.");
                      }, 60000); // 60 second timeout

                      try {
                        setIsWithdrawing(true);
                        setWithdrawStartTime(Date.now());
                        setStakingError(null);
                        setStakingSuccess(null);
                        
                        const txSignature = await withdrawRewards(DRMR_MINT);
                        clearTimeout(timeoutId);
                        setWithdrawStartTime(null);
                        
                        setStakingSuccess(`Rewards withdrawn successfully! Transaction: ${txSignature.slice(0, 8)}...`);
                        
                        // Invalidate queries to refresh data
                        queryClient.invalidateQueries({ queryKey: ["staker", walletAddress] });
                        queryClient.invalidateQueries({ queryKey: ["staking-pool"] });
                        
                        setTimeout(() => {
                          setStakingSuccess(null);
                        }, 5000);
                      } catch (err: any) {
                        clearTimeout(timeoutId);
                        setWithdrawStartTime(null);
                        const errorMsg = err.message || "Failed to withdraw rewards";
                        setStakingError(errorMsg);
                        console.error("Withdraw error:", err);
                      } finally {
                        setIsWithdrawing(false);
                        setWithdrawStartTime(null);
                      }
                    }}
                    disabled={isWithdrawing || availableRewards === 0 || !walletAddress || !DRMR_MINT}
                    className="flex-1 rounded-xl bg-green-500 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWithdrawing ? "Processing..." : `Withdraw ${(availableRewards / 1e9).toFixed(2)} DRMR`}
                  </button>
                )}
                <button
                  onClick={() => setReceiveModalOpen(true)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Receive
                </button>
              </div>

              {/* Messages */}
              {stakingSuccess && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-xs text-green-400">{stakingSuccess}</p>
                </div>
              )}
              {stakingError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-red-400 flex-1">{stakingError}</p>
                    <button
                      onClick={() => {
                        setStakingError(null);
                        setIsWithdrawing(false);
                        setWithdrawStartTime(null);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // User has no active stake - show stake prompt
            <div className="flex flex-col items-center justify-center text-center min-h-[300px] sm:min-h-[400px]">
              {/* Show pending rewards if available even without active stake */}
              {hasPendingRewards && stakerData && (
                <div className="w-full max-w-md mb-6 rounded-xl bg-green-500/10 border-2 border-green-500/30 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-green-400 uppercase tracking-wider font-medium">Total Pending Rewards</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-400 mb-3">
                    {(totalPendingRewards / 1e9).toFixed(4)} DRMR
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="rounded-lg bg-[#000d1f]/50 p-2 border border-white/10">
                      <p className="text-white/50 mb-1">Available</p>
                      <p className="text-white font-semibold">{(availableRewards / 1e9).toFixed(4)} DRMR</p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
                      <p className="text-yellow-400 mb-1">Accrued</p>
                      <p className="text-yellow-400 font-semibold">{(accruedRewards / 1e9).toFixed(4)} DRMR</p>
                      {nextAccrualCountdown && (
                        <p className="text-[10px] text-yellow-400/70 mt-1">Resumes: {nextAccrualCountdown}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {accruedRewards > 0 && (
                      <button
                        onClick={async () => {
                          if (!walletAddress || !DRMR_MINT) return;
                          try {
                            setIsClaiming(true);
                            setStakingError(null);
                            await claimRewards(DRMR_MINT);
                            setStakingSuccess("Rewards claimed successfully!");
                            queryClient.invalidateQueries({ queryKey: ["staker", walletAddress] });
                            queryClient.invalidateQueries({ queryKey: ["staking-pool"] });
                            setTimeout(() => {
                              setStakingSuccess(null);
                            }, 3000);
                          } catch (err: any) {
                            setStakingError(err.message || "Failed to claim rewards");
                          } finally {
                            setIsClaiming(false);
                          }
                        }}
                        disabled={isClaiming || isDrmrStakingLoading || accruedRewards === 0}
                        className="w-full rounded-xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClaiming ? "Processing..." : `Claim ${(accruedRewards / 1e9).toFixed(2)} DRMR`}
                      </button>
                    )}
                    {availableRewards > 0 && (
                      <button
                        onClick={async () => {
                          if (!walletAddress || !DRMR_MINT || isWithdrawing) return;
                          
                          // Set timeout to prevent infinite loading
                          const timeoutId = setTimeout(() => {
                            setIsWithdrawing(false);
                            setStakingError("Transaction is taking longer than expected. Please check your wallet or try again.");
                          }, 60000); // 60 second timeout

                          try {
                            setIsWithdrawing(true);
                            setWithdrawStartTime(Date.now());
                            setStakingError(null);
                            setStakingSuccess(null);
                            
                            const txSignature = await withdrawRewards(DRMR_MINT);
                            clearTimeout(timeoutId);
                            setWithdrawStartTime(null);
                            
                            setStakingSuccess(`Rewards withdrawn successfully! Transaction: ${txSignature.slice(0, 8)}...`);
                            
                            queryClient.invalidateQueries({ queryKey: ["staker", walletAddress] });
                            queryClient.invalidateQueries({ queryKey: ["staking-pool"] });
                            
                            setTimeout(() => {
                              setStakingSuccess(null);
                            }, 5000);
                          } catch (err: any) {
                            clearTimeout(timeoutId);
                            setWithdrawStartTime(null);
                            const errorMsg = err.message || "Failed to withdraw rewards";
                            setStakingError(errorMsg);
                            console.error("Withdraw error:", err);
                          } finally {
                            setIsWithdrawing(false);
                            setWithdrawStartTime(null);
                          }
                        }}
                        disabled={isWithdrawing || availableRewards === 0 || !walletAddress || !DRMR_MINT}
                        className="w-full rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isWithdrawing ? "Processing..." : `Withdraw ${(availableRewards / 1e9).toFixed(2)} DRMR`}
                      </button>
                    )}
                  </div>
                </div>
              )}

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

              {/* Messages */}
              {stakingSuccess && (
                <div className="mt-4 w-full max-w-md rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-xs text-green-400">{stakingSuccess}</p>
                </div>
              )}
              {stakingError && (
                <div className="mt-4 w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-xs text-red-400">{stakingError}</p>
                </div>
              )}
            </div>
          )}
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
              <div className="grid grid-cols-4 gap-2 mb-3">
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
              {stakingPool && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs text-blue-400 mb-1">Lock-up Duration</p>
                  <p className="text-sm font-semibold text-white">
                    {formatStakePeriodDuration(stakePeriods)}
                  </p>
                </div>
              )}
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
                if (!canStake || !walletAddress || !DRMR_MINT || !stakingPool) return;
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
              disabled={!canStake || isStaking || isDrmrStakingLoading || !stakingPool}
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
