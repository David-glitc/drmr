"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useAdminVerification } from "../../../hooks/useAdminVerification";
import { useQuery } from "@tanstack/react-query";
import { AdminPasswordModal } from "../../../components/AdminPasswordModal";
import { PublicKey } from "@solana/web3.js";

type Tab = "monitoring" | "pool-details" | "manage-pool" | "initialize-pool" | "close-pool";

// Define verifyPassword function outside component to ensure it's always available
const createVerifyPassword = (): ((password: string) => Promise<boolean>) => {
  return async (password: string): Promise<boolean> => {
    try {
      console.log("[verifyPassword] Attempting to verify password...");
      const response = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      console.log("[verifyPassword] Response status:", response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error("[verifyPassword] API error:", response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("[verifyPassword] Response data:", data);
      return data.success === true;
    } catch (error) {
      console.error("[verifyPassword] Error verifying password:", error);
      throw error; // Re-throw to let the modal handle the error message
    }
  };
};

export default function StakingAdminPage() {
  const { publicKey: wallet } = useWallet();
  const { isAdmin, verifyAdmin, trustedAdminAddress } = useAdminVerification();
  const { 
    fetchStakingPool, 
    updatePoolConfig, 
    initializePool, 
    closePool,
    fetchAllStakers,
    isLoading, 
    error 
  } = useDrmrStaking();
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("monitoring");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  // Define verifyPassword function directly - always available as a function
  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      console.log("[verifyPassword] Attempting to verify password...");
      const response = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      console.log("[verifyPassword] Response status:", response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error("[verifyPassword] API error:", response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("[verifyPassword] Response data:", data);
      return data.success === true;
    } catch (error) {
      console.error("[verifyPassword] Error verifying password:", error);
      throw error; // Re-throw to let the modal handle the error message
    }
  }, []);

  const handleInitialize = async () => {
    if (!passwordVerified) {
      setErrorMessage("Please verify password to access admin panel");
      return;
    }
    
    if (!wallet) {
      setErrorMessage("Please connect your wallet");
      return;
    }
    
    if (!isVerified) {
      setErrorMessage("Only the designated admin wallet can initialize the pool");
      return;
    }

    if (!initDrmrMint) {
      setErrorMessage("DRMR mint address is required");
      return;
    }

    const apy = parseInt(initApyBps);
    const cycles = parseInt(initMaxStakeEpochCycles);

    if (isNaN(apy) || apy < 0 || apy > 10000) {
      setErrorMessage("APY must be between 0 and 10000 (10000 = 100%)");
      return;
    }

    if (isNaN(cycles) || cycles < 1) {
      setErrorMessage("Max stake epoch cycles must be at least 1");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const tx = await initializePool(apy, cycles, initDrmrMint);
      setSuccessMessage(`Staking pool initialized successfully! Transaction: ${tx}`);
      
      setInitApyBps("");
      setInitMaxStakeEpochCycles("");
      fetchStakingPool();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize staking pool");
    }
  };

  const handleUpdate = async () => {
    if (!passwordVerified) {
      setErrorMessage("Please verify password to access admin panel");
      return;
    }
    
    if (!wallet) {
      setErrorMessage("Please connect your wallet");
      return;
    }
    
    if (!isVerified) {
      setErrorMessage("Only the designated admin wallet can update pool configuration");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const tx = await updatePoolConfig(
        newAdmin || null,
        newStakeEpochCycles ? parseInt(newStakeEpochCycles) : null,
        newRewardCycleSeconds ? parseInt(newRewardCycleSeconds) : null,
        newApyBps ? parseInt(newApyBps) : null,
        newIsActive
      );

      setSuccessMessage(`Pool configuration updated! Transaction: ${tx}`);
      
      setNewAdmin("");
      setNewStakeEpochCycles("");
      setNewRewardCycleSeconds("");
      setNewApyBps("");
      setNewIsActive(null);
      
      fetchStakingPool();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update pool configuration");
    }
  };

  const handleClosePool = async () => {
    if (!passwordVerified) {
      setErrorMessage("Please verify password to access admin panel");
      return;
    }
    
    if (!wallet) {
      setErrorMessage("Please connect your wallet");
      return;
    }
    
    if (!isVerified) {
      setErrorMessage("Only the designated admin wallet can close the pool");
      return;
    }

    if (!stakingPool) {
      setErrorMessage("Pool is not initialized");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const tx = await closePool();
      setSuccessMessage(`Pool closed successfully! Transaction: ${tx}`);
      setShowCloseConfirm(false);
      
      // Refetch pool data (should return null after closing)
      setTimeout(() => {
        fetchStakingPool();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to close pool");
    }
  };

  // Allow access with just password, wallet not required for viewing
  // But wallet is required for editing operations

  if (isVerifying) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Verifying admin access...</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-8">
          <p className="text-white/70">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  // Show password modal if not verified
  if (!passwordVerified) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Admin</h1>
            <p className="text-xs sm:text-sm text-white/60">Password required to access admin panel</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111118] p-8">
            <p className="text-white/70 mb-4">Please enter the admin password to continue.</p>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Enter Password
            </button>
            <p className="text-xs text-white/50 mt-4">Or press Ctrl + Shift + D</p>
          </div>
        </div>
        <AdminPasswordModal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={handlePasswordSuccess}
          onVerifyPassword={verifyPassword}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Manage staking pool configuration</p>
        </div>

        {/* Warning banner if user has password but not admin wallet */}
        {passwordVerified && (!wallet || !isVerified) && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-yellow-400 font-semibold mb-1">View-Only Access</p>
            <p className="text-white/70 text-sm">
              You have password access to view the admin panel, but only the designated admin wallet can modify pool settings.
            </p>
            {wallet && !isVerified && (
              <p className="text-white/50 text-xs mt-2">
                Admin Wallet: {trustedAdminAddress.slice(0, 8)}...{trustedAdminAddress.slice(-8)} | 
                Your Wallet: {wallet.toBase58().slice(0, 8)}...{wallet.toBase58().slice(-8)}
              </p>
            )}
            {!wallet && (
              <p className="text-white/50 text-xs mt-2">
                Please connect the admin wallet to modify pool settings.
              </p>
            )}
          </div>
        )}

        {/* Initialize Pool Banner - Show when pool doesn't exist */}
        {!stakingPool && (
          <div className="rounded-2xl border border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Initialize Staking Pool</h2>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  The staking pool needs to be initialized before users can stake. Configure the pool settings and initialize it now.
                </p>
                <button
                  onClick={() => setActiveTab("initialize-pool")}
                  className="rounded-xl border border-yellow-500/50 bg-yellow-500/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-yellow-500/30"
                >
                  Initialize Pool Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "monitoring"
                ? "border-b-2 border-white text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Monitoring
          </button>
          <button
            onClick={() => setActiveTab("pool-details")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "pool-details"
                ? "border-b-2 border-white text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Pool Details
          </button>
          <button
            onClick={() => setActiveTab("manage-pool")}
            className={`px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === "manage-pool"
                ? "border-b-2 border-white text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Manage Pool
          </button>
          <button
            onClick={() => setActiveTab("initialize-pool")}
            className={`px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === "initialize-pool"
                ? "border-b-2 border-white text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Initialize Pool
          </button>
          <button
            onClick={() => setActiveTab("close-pool")}
            className={`px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === "close-pool"
                ? "border-b-2 border-white text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Close Pool
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "monitoring" && (
          <div className="rounded-2xl border border-white/10 bg-[#111118] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Stakers Monitoring</h2>
            
            {isLoadingStakers ? (
              <p className="text-white/70">Loading stakers...</p>
            ) : !allStakers || allStakers.length === 0 ? (
              <p className="text-white/70">No stakers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/70 font-medium">Wallet</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Staked Amount</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Available Rewards</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Total Rewards Claimed</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Stake Periods</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Staked At</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Stake End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStakers.map((staker) => (
                      <tr key={staker.publicKey.toBase58()} className="border-b border-white/5">
                        <td className="py-3 px-4 text-white font-mono text-xs">
                          {staker.user.toBase58().slice(0, 8)}...{staker.user.toBase58().slice(-8)}
                        </td>
                        <td className="py-3 px-4 text-white text-right">
                          {(Number(staker.amount) / 1e9).toFixed(2)} DRMR
                        </td>
                        <td className="py-3 px-4 text-white text-right">
                          {(Number(staker.availableRewards) / 1e9).toFixed(2)} DRMR
                        </td>
                        <td className="py-3 px-4 text-white text-right">
                          {(Number(staker.totalRewardsClaimed) / 1e9).toFixed(2)} DRMR
                        </td>
                        <td className="py-3 px-4 text-white text-right">
                          {staker.stakePeriods}
                        </td>
                        <td className="py-3 px-4 text-white text-right text-xs">
                          {new Date(Number(staker.stakedAt) * 1000).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-white text-right text-xs">
                          {new Date(Number(staker.stakeEndTime) * 1000).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "pool-details" && (
          <div className="space-y-6">
            {!stakingPool ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Pool Not Initialized</h2>
                <p className="text-white/70 mb-4">The staking pool has not been initialized yet.</p>
                <button
                  onClick={() => setActiveTab("manage-pool")}
                  className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-yellow-500/20"
                >
                  Go to Initialize Pool
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Pool Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Admin</p>
                    <p className="text-sm text-white font-mono">{stakingPool.admin.toBase58()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">DRMR Mint</p>
                    <p className="text-sm text-white font-mono">{stakingPool.drmrMint.toBase58()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">APY</p>
                    <p className="text-sm text-white">{(stakingPool.apyBps / 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Max Stake Epoch Cycles</p>
                    <p className="text-sm text-white">{stakingPool.stakeEpochCycles.toString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Reward Cycle Seconds</p>
                    <p className="text-sm text-white">{stakingPool.rewardCycleSeconds.toString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Is Active</p>
                    <p className="text-sm text-white">{stakingPool.isActive ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Total Staked</p>
                    <p className="text-sm text-white">{(Number(stakingPool.totalStaked) / 1e9).toFixed(2)} DRMR</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Total Stakers</p>
                    <p className="text-sm text-white">{stakingPool.totalStakers.toString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Total Rewards Distributed</p>
                    <p className="text-sm text-white">{(Number(stakingPool.totalRewardsDistributed) / 1e9).toFixed(2)} DRMR</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Rewards In Pool</p>
                    <p className="text-sm text-white">{(Number(stakingPool.rewardsInPool) / 1e9).toFixed(2)} DRMR</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Created At</p>
                    <p className="text-sm text-white">
                      {new Date(Number(stakingPool.createdAt) * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Last Reward Distribution</p>
                    <p className="text-sm text-white">
                      {new Date(Number(stakingPool.lastRewardDistribution) * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "manage-pool" && (
          <div className="space-y-6">
            {/* Update Form - Only show when pool exists */}
            {stakingPool && (
              <div className="rounded-2xl border border-white/10 bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Update Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New Admin Address (optional)</label>
                    <input
                      type="text"
                      value={newAdmin}
                      onChange={(e) => setNewAdmin(e.target.value)}
                      placeholder="Leave empty to keep current admin"
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New Max Stake Epoch Cycles (optional)</label>
                    <input
                      type="number"
                      value={newStakeEpochCycles}
                      onChange={(e) => setNewStakeEpochCycles(e.target.value)}
                      placeholder={stakingPool?.stakeEpochCycles.toString() || "Current value"}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New Reward Cycle Seconds (optional)</label>
                    <input
                      type="number"
                      value={newRewardCycleSeconds}
                      onChange={(e) => setNewRewardCycleSeconds(e.target.value)}
                      placeholder={stakingPool?.rewardCycleSeconds.toString() || "Current value"}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <p className="text-xs text-white/50 mt-1">Example: 86400 = 1 day, 300 = 5 minutes</p>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New APY in Basis Points (optional)</label>
                    <input
                      type="number"
                      value={newApyBps}
                      onChange={(e) => setNewApyBps(e.target.value)}
                      placeholder={`${stakingPool?.apyBps || 0} (${((stakingPool?.apyBps || 0) / 100).toFixed(2)}%)`}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <p className="text-xs text-white/50 mt-1">10000 = 100%, 1000 = 10%, Max: 10000</p>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Pool Active Status (optional)</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setNewIsActive(true)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          newIsActive === true
                            ? "border-green-500 bg-green-500/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setNewIsActive(false)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          newIsActive === false
                            ? "border-red-500 bg-red-500/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        Inactive
                      </button>
                      <button
                        onClick={() => setNewIsActive(null)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          newIsActive === null
                            ? "border-blue-500 bg-blue-500/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        No Change
                      </button>
                    </div>
                  </div>

                  {successMessage && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                      <p className="text-sm font-semibold text-green-400">{successMessage}</p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleUpdate}
                    disabled={isLoading || !isVerified}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Updating..." : "Update Pool Configuration"}
                  </button>
                  {!isVerified && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Only the designated admin wallet can update pool configuration
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "initialize-pool" && (
          <div className="space-y-6">
            {stakingPool ? (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Pool Already Initialized</h2>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  The staking pool has already been initialized. You can view the pool details in the "Pool Details" tab or update the configuration in the "Manage Pool" tab.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Initialize Staking Pool</h2>
                </div>
                <p className="text-sm text-white/70 mb-6">The staking pool has not been initialized yet. Please configure and initialize it below.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">DRMR Mint Address *</label>
                    <input
                      type="text"
                      value={initDrmrMint}
                      onChange={(e) => setInitDrmrMint(e.target.value)}
                      placeholder="Enter DRMR token mint address"
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">APY in Basis Points *</label>
                    <input
                      type="number"
                      value={initApyBps}
                      onChange={(e) => setInitApyBps(e.target.value)}
                      placeholder="1000 (10%)"
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <p className="text-xs text-white/50 mt-1">10000 = 100%, 1000 = 10%, Max: 10000</p>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Max Stake Epoch Cycles *</label>
                    <input
                      type="number"
                      value={initMaxStakeEpochCycles}
                      onChange={(e) => setInitMaxStakeEpochCycles(e.target.value)}
                      placeholder="4"
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <p className="text-xs text-white/50 mt-1">Minimum: 1 epoch cycle</p>
                  </div>

                  {successMessage && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                      <p className="text-sm font-semibold text-green-400">{successMessage}</p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm font-semibold text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleInitialize}
                    disabled={isLoading || !isVerified}
                    className="w-full rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Initializing..." : "Initialize Staking Pool"}
                  </button>
                  {!isVerified && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Only the designated admin wallet can initialize the pool
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "close-pool" && (
          <div className="space-y-6">
            {!stakingPool ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Pool Not Initialized</h2>
                </div>
                <p className="text-sm text-white/70">
                  The staking pool has not been initialized yet. There is nothing to close.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Close Staking Pool</h2>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  <strong className="text-red-400">Warning:</strong> Closing the pool is a destructive operation. 
                  This will close the staking pool account and send the rent to the admin. 
                  Make sure all stakers have withdrawn their tokens before closing.
                </p>
                
                {!showCloseConfirm ? (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/30"
                  >
                    Close Pool
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-red-500/50 bg-red-500/20 p-4">
                      <p className="text-sm font-semibold text-white mb-2">Are you absolutely sure?</p>
                      <p className="text-xs text-white/70">
                        This action cannot be undone. The staking pool will be permanently closed.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCloseConfirm(false)}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClosePool}
                        disabled={isLoading || !isVerified}
                        className="flex-1 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Closing..." : "Confirm Close Pool"}
                      </button>
                      {!isVerified && (
                        <p className="text-xs text-yellow-400 mt-2 text-center">
                          Only the designated admin wallet can close the pool
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AdminPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        onVerifyPassword={verifyPassword}
      />
    </>
  );
}
