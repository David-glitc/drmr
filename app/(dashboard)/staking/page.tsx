"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { useWallet } from "../../../hooks/useWallet";
import { useSolanaAccount } from "../../../hooks/useSolanaAccount";
import { useValidators } from "../../../hooks/useValidators";
import { useStakingRecords } from "../../../hooks/useStakingRecords";
import { useSolanaStaking } from "../../../hooks/useSolanaStaking";
import { useSolPrice } from "../../../hooks/useSolPrice";
import { ReceiveModal } from "../../../components/ReceiveModal";
import { stakingService } from "../../../lib/services";
import type { ValidatorInfo } from "../../../lib/services/validator-service";

const fallbackAllocation = [
  { label: "SOL Stakers", value: 54, fill: "#3b82f6" },
  { label: "DRMR Stakers", value: 38, fill: "#ef4444" },
  { label: "Idle Liquidity", value: 8, fill: "#3b82f6" },
];

const fallbackApy = [
  { epoch: "Week 1", apy: 7.4 },
  { epoch: "Week 2", apy: 7.6 },
  { epoch: "Week 3", apy: 7.8 },
  { epoch: "Week 4", apy: 8.1 },
];

export default function StakingPage() {
  const { allocation } = useAnalytics();
  const { activePool, poolConfig, estimatedRewards, estimateRewards } = useStaking();
  const { walletAddress, isConnected } = useWallet();
  const { data: solanaAccount } = useSolanaAccount(walletAddress ?? null);
  const { data: solPrice } = useSolPrice();
  const { validators, isLoading: validatorsLoading } = useValidators(true); // Sync with DB
  const { createStakingRecord, isCreating: isCreatingStake } = useStakingRecords();
  const { createAndDelegateStake, getStakeBalance, isReady: isStakingReady } = useSolanaStaking();
  
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedValidator, setSelectedValidator] = useState<string>("");
  const [tokenType, setTokenType] = useState<"SOL" | "DRMR">("SOL");
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [stakingSuccess, setStakingSuccess] = useState<string | null>(null);
  
  // Set default validator when validators load
  useEffect(() => {
    if (validators.length > 0 && !selectedValidator) {
      setSelectedValidator(validators[0].voteAccount);
    }
  }, [validators, selectedValidator]);
  
  const selectedValidatorInfo = validators.find(v => v.voteAccount === selectedValidator) as (ValidatorInfo & { id?: string }) | undefined;
  
  const minStakeAmount = 0.012306085;
  const hasInsufficientBalance = solanaAccount 
    ? solanaAccount.balanceSol < minStakeAmount 
    : true;
  const canStake = tokenType === "SOL" && stakeAmount && parseFloat(stakeAmount) >= minStakeAmount && !hasInsufficientBalance;
  
  // Calculate annual return based on selected validator
  const annualReturn = selectedValidatorInfo && stakeAmount
    ? stakingService.calculateAnnualReturn(parseFloat(stakeAmount), selectedValidatorInfo.apy)
    : 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
          <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking</h1>
        <p className="text-xs sm:text-sm text-white/60">Stake your tokens to steadily earn rewards</p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_400px] overflow-x-hidden">
        {/* Main Content */}
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-8 lg:p-12">
          <div className="flex flex-col items-center justify-center text-center min-h-[300px] sm:min-h-[400px]">
            {/* Piggy Bank Illustration Placeholder */}
            <div className="mb-6 sm:mb-8 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <svg className="w-20 h-20 sm:w-32 sm:h-32 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 px-2">Earn with DRMR</h2>
            <p className="text-sm sm:text-base text-white/70 mb-6 sm:mb-8 max-w-md px-2">
              Stake your tokens to steadily earn rewards. You can stake SOL for your SOL.
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

        {/* Stake Modal/Sidebar */}
        {isStakeModalOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setIsStakeModalOpen(false)}
            />
            <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-[#111118] p-4 sm:p-6 overflow-y-auto overflow-x-hidden lg:relative lg:z-auto lg:rounded-2xl lg:border lg:border-white/10">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white">Stake</h3>
                <button
                  onClick={() => setIsStakeModalOpen(false)}
                  className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Token Type Selector */}
              <div className="mb-6">
                <label className="text-sm text-white/70 mb-2 block">Token Type</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTokenType("SOL")}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      tokenType === "SOL"
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    SOL
                  </button>
                  <button
                    onClick={() => {}}
                    disabled={true}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition cursor-not-allowed ${
                      tokenType === "DRMR"
                        ? "border-red-500/50 bg-red-500/10 text-white/50"
                        : "border-white/10 bg-white/5 text-white/40 opacity-50"
                    }`}
                    title="DRMR staking coming soon"
                  >
                    DRMR
                    <span className="ml-2 text-xs">(Coming Soon)</span>
                  </button>
                </div>
              </div>

              {/* Amount Input with Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/70">Amount</label>
                  <span className="text-xs text-white/60">
                    Max: {solanaAccount?.balanceSol.toFixed(4) || "0"} {tokenType}
                  </span>
                </div>
                
                {/* Percentage Buttons */}
                <div className="flex items-center gap-2 mb-3">
                  {[25, 50, 75].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => {
                        if (solanaAccount && tokenType === "SOL") {
                          const value = (solanaAccount.balanceSol * percent) / 100;
                          setStakeAmount(value.toFixed(9).replace(/\.?0+$/, ""));
                        }
                      }}
                      disabled={tokenType === "DRMR"}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {percent}%
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (solanaAccount && tokenType === "SOL") {
                        setStakeAmount(solanaAccount.balanceSol.toFixed(9).replace(/\.?0+$/, ""));
                      }
                    }}
                    disabled={tokenType === "DRMR"}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Max
                  </button>
                </div>

                {/* Amount Display */}
                <div className="flex items-center gap-3 mb-3 min-w-0 overflow-x-hidden">
                  {/* Token Logo - Outside Input */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
                    tokenType === "SOL" ? "bg-blue-500/20" : "bg-red-500/20"
                  }`}>
                    {tokenType === "SOL" ? (
                      <Image
                      src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                      alt="SOL"
                        width={40}
                        height={40}
                      className="w-full h-full object-cover"
                        unoptimized
                      onError={(e) => {
                        e.currentTarget.outerHTML = '<span class="text-xs font-semibold text-blue-400">SOL</span>';
                      }}
                    />
                    ) : (
                      <span className="text-xs font-semibold text-red-400">DRMR</span>
                    )}
                  </div>
                  
                  {/* Input Container */}
                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 min-w-0">
                  <input
                    type="text"
                    value={stakeAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setStakeAmount(value);
                      }
                    }}
                    placeholder="0"
                      disabled={tokenType === "DRMR"}
                      className="flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                  />
                    <span className="text-xs text-white/60 font-medium">{tokenType}</span>
                    {solPrice && stakeAmount && tokenType === "SOL" && (
                    <span className="text-xs text-white/60">
                      ${(parseFloat(stakeAmount) * solPrice).toFixed(2)}
                    </span>
                  )}
                  </div>
                </div>

                {/* Slider */}
                {solanaAccount && solanaAccount.balanceSol > 0 && tokenType === "SOL" && (
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max={solanaAccount.balanceSol}
                      step="0.01"
                      value={stakeAmount || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setStakeAmount(value.toFixed(9).replace(/\.?0+$/, ""));
                      }}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0a0a0f] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0a0a0f] [&::-moz-range-thumb]:border-none"
                      style={{
                        background: solanaAccount.balanceSol > 0
                          ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((parseFloat(stakeAmount || "0") / solanaAccount.balanceSol) * 100)}%, rgba(255,255,255,0.1) ${((parseFloat(stakeAmount || "0") / solanaAccount.balanceSol) * 100)}%, rgba(255,255,255,0.1) 100%)`
                          : undefined
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Validator Selection */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm text-white/70">Select Validator</label>
                  <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {validatorsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 w-full bg-white/10 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : validators.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-sm text-white/60">No validators available</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {validators.map((validator) => {
                      const isSelected = validator.voteAccount === selectedValidator;
                      return (
                        <button
                          key={validator.voteAccount}
                          onClick={() => setSelectedValidator(validator.voteAccount)}
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-white truncate">
                                  {validator.name}
                                </h4>
                                {isSelected && (
                                  <svg className="h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/60">
                                <span className="text-blue-400 font-semibold">
                                  {stakingService.formatAPY(validator.apy)} APY
                                </span>
                                <span>•</span>
                                <span>{validator.commission}% commission</span>
                              </div>
                              <p className="text-xs text-white/50 mt-1 truncate">
                                {(validator.activatedStake / 1e9).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} SOL staked
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Annual Return */}
              {selectedValidatorInfo && stakeAmount && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-white/70">Annual return</span>
                    <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white">
                    {annualReturn.toFixed(4)} SOL
                  </p>
                </div>
              )}

              {/* Total Stake */}
              {selectedValidatorInfo && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-white/70">Total stake</span>
                    <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white">
                    {(selectedValidatorInfo.activatedStake / 1e9).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })} SOL
                  </p>
                </div>
              )}

              {/* Error Message */}
              {hasInsufficientBalance && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-1">Balance too low to stake</p>
                  <p className="text-xs text-white/70">
                    You need at least {minStakeAmount} SOL to start staking.
                  </p>
                </div>
              )}

              {/* Stake Button */}
              {/* Success Message */}
              {stakingSuccess && (
                <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-sm font-semibold text-green-400 mb-1">Staking Successful!</p>
                  <p className="text-xs text-white/70">{stakingSuccess}</p>
                </div>
              )}
              
              {/* Error Message */}
              {stakingError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-400 mb-1">Staking Error</p>
                  <p className="text-xs text-white/70">{stakingError}</p>
                </div>
              )}

              {/* Stake Button */}
              <button
                onClick={async () => {
                  if (!canStake || !selectedValidatorInfo || !walletAddress || !isStakingReady) return;
                  
                  try {
                    setIsStaking(true);
                    setStakingError(null);
                    setStakingSuccess(null);
                    
                    // Validate inputs
                    if (!walletAddress) {
                      throw new Error("Wallet not connected");
                    }
                    if (!selectedValidatorInfo) {
                      throw new Error("Please select a validator");
                    }
                    if (!isStakingReady) {
                      throw new Error("Staking service not ready");
                    }
                    
                    const amount = parseFloat(stakeAmount);
                    if (isNaN(amount) || amount <= 0) {
                      throw new Error("Invalid stake amount");
                    }
                    
                    // Only allow SOL staking for now
                    if (tokenType !== "SOL") {
                      throw new Error("DRMR staking is not yet available");
                    }
                    
                    console.log(`[Staking] Starting stake process...`);
                    console.log(`[Staking] Amount: ${amount} SOL`);
                    console.log(`[Staking] Validator: ${selectedValidatorInfo.voteAccount}`);
                    console.log(`[Staking] Wallet: ${walletAddress}`);
                    
                    // Create and delegate stake account on Solana
                    console.log(`[Staking] Creating stake account and delegating...`);
                    
                    const { stakeAccount, createSignature, delegateSignature } = await createAndDelegateStake(
                      amount,
                      selectedValidatorInfo.voteAccount
                    );
                    
                    const stakeAccountAddress = stakeAccount.publicKey.toBase58();
                    console.log(`[Staking] ✓ Stake account created: ${stakeAccountAddress}`);
                    console.log(`[Staking] ✓ Create transaction: ${createSignature}`);
                    console.log(`[Staking] ✓ Delegate transaction: ${delegateSignature}`);
                    
                    // Verify stake account was created successfully
                    try {
                      console.log(`[Staking] Verifying stake account...`);
                      const stakeBalance = await getStakeBalance(stakeAccountAddress);
                      console.log(`[Staking] ✓ Verified stake account balance: ${stakeBalance} SOL`);
                    } catch (error) {
                      console.warn(`[Staking] ⚠ Could not verify stake account balance:`, error);
                      // Don't fail the whole process if verification fails
                    }

                    // Create staking record in database
                    try {
                      console.log(`[Staking] Creating staking record in database...`);
                    const validatorId = (selectedValidatorInfo as ValidatorInfo & { id?: string }).id || selectedValidator;
                    await createStakingRecord({
                      validatorId: validatorId,
                      amount: amount,
                        stakeAccount: stakeAccountAddress,
                        walletAddress: walletAddress,
                      });
                      console.log(`[Staking] ✓ Staking record created`);
                    } catch (error) {
                      console.error(`[Staking] ✗ Failed to create staking record:`, error);
                      // Still show success since the actual staking worked
                      console.warn(`[Staking] Note: Staking succeeded but database record failed`);
                    }

                    // Show success message
                    const successMessage = `Successfully staked ${amount} ${tokenType} to ${selectedValidatorInfo.name || selectedValidatorInfo.voteAccount.slice(0, 8)}...`;
                    setStakingSuccess(successMessage);
                    setStakingError(null);
                    console.log(`[Staking] ✓ ${successMessage}`);
                    
                    // Reset form after delay
                    setTimeout(() => {
                      setStakeAmount("");
                      setIsStakeModalOpen(false);
                      setStakingSuccess(null);
                    }, 3000);
                  } catch (error) {
                    console.error("[Staking] ✗ Staking error:", error);
                    let errorMessage = "Failed to stake";
                    
                    if (error instanceof Error) {
                      errorMessage = error.message;
                      // Provide more user-friendly error messages
                      if (error.message.includes("User rejected")) {
                        errorMessage = "Transaction was cancelled";
                      } else if (error.message.includes("insufficient funds") || error.message.includes("Insufficient")) {
                        errorMessage = "Insufficient balance. Make sure you have enough SOL for staking and transaction fees.";
                      } else if (error.message.includes("Wallet not connected")) {
                        errorMessage = "Wallet not connected. Please connect your wallet.";
                      } else if (error.message.includes("signTransaction")) {
                        errorMessage = "Failed to sign transaction. Please try again.";
                      }
                    }
                    
                    setStakingError(errorMessage);
                    setStakingSuccess(null);
                  } finally {
                    setIsStaking(false);
                  }
                }}
                disabled={!canStake || isStaking || isCreatingStake || !isStakingReady}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tokenType === "DRMR" 
                  ? "DRMR Staking Coming Soon" 
                  : isStaking || isCreatingStake 
                    ? "Staking..." 
                    : `Stake ${tokenType}`
                }
              </button>
            </div>
          </>
        )}

        {/* Staking Stats */}
        {!isStakeModalOpen && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
              <p className="text-xs text-white/60 mb-2">APY preview</p>
              <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-1">
            {poolConfig.apy}
          </h3>
              <p className="text-xs text-white/60">{poolConfig.epoch}</p>
              <p className="mt-3 text-xs sm:text-sm text-white/70">
            {poolConfig.description}
          </p>

              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-sm text-red-400 mb-1">TVL {poolConfig.tvl}</p>
                <p className="text-xs text-white/70">
                  Rewards accrue daily and can be claimed every epoch with a single transaction.
            </p>
          </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#0a0a0f] p-3 sm:p-4">
                <p className="text-xs text-white/60 mb-3">Reward simulator</p>
                <div className="grid grid-cols-2 gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => estimateRewards(activePool, amount)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  {amount.toLocaleString()} {activePool}
                </button>
              ))}
            </div>
                <p className="mt-3 text-xs text-white/70">
              Estimated epoch rewards:{" "}
              <span className="text-white">{estimatedRewards}</span>
            </p>
          </div>
        </div>

            <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
              <p className="text-xs text-white/60 mb-4">APY History</p>
              <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fallbackApy}>
                  <Tooltip
                      contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="apy"
                      stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

            <div className="rounded-2xl border border-white/10 bg-[#111118] p-4 sm:p-6">
              <p className="text-xs text-white/60 mb-4">Allocation Mix</p>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="h-32 sm:h-40 w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                        contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Pie
                      data={
                        allocation.length
                          ? allocation.map((slice: { label: string; percent: number }, index: number) => ({
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
                <div className="flex-1 space-y-2 text-sm text-white/70">
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
        )}
      </div>

      {/* Receive Modal */}
      {isConnected && walletAddress && (
        <ReceiveModal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          walletAddress={walletAddress}
          tokenSymbol="SOL"
        />
      )}
    </div>
  );
}
