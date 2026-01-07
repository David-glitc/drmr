"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useAdminVerification } from "../../../hooks/useAdminVerification";
import { useQuery } from "@tanstack/react-query";

export default function StakingAdminPage() {
  const { publicKey: wallet } = useWallet();
  const { isAdmin, verifyAdmin, trustedAdminAddress } = useAdminVerification();
  const { fetchStakingPool, updatePoolConfig, isLoading, error } = useDrmrStaking();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: stakingPool } = useQuery({
    queryKey: ["staking-pool"],
    queryFn: fetchStakingPool,
    refetchInterval: 30000,
  });

  // Form state
  const [newAdmin, setNewAdmin] = useState("");
  const [newStakeEpochCycles, setNewStakeEpochCycles] = useState("");
  const [newRewardCycleSeconds, setNewRewardCycleSeconds] = useState("");
  const [newApyBps, setNewApyBps] = useState("");
  const [newIsActive, setNewIsActive] = useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verify admin on mount
  useEffect(() => {
    const checkAdmin = async () => {
      if (wallet && isAdmin) {
        setIsVerifying(true);
        try {
          const verified = await verifyAdmin();
          setIsVerified(verified);
        } catch (err) {
          console.error("Error verifying admin:", err);
          setIsVerified(false);
        } finally {
          setIsVerifying(false);
        }
      }
    };
    checkAdmin();
  }, [wallet, isAdmin, verifyAdmin]);

  const handleUpdate = async () => {
    if (!wallet || !isVerified) {
      setErrorMessage("You must be the admin to update pool configuration");
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
      
      // Reset form
      setNewAdmin("");
      setNewStakeEpochCycles("");
      setNewRewardCycleSeconds("");
      setNewApyBps("");
      setNewIsActive(null);
      
      // Refetch pool data
      fetchStakingPool();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update pool configuration");
    }
  };

  if (!wallet) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking Pool Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Manage staking pool configuration</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-8">
          <p className="text-white/70">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking Pool Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Verifying admin access...</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-8">
          <p className="text-white/70">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking Pool Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Manage staking pool configuration</p>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
          <p className="text-red-400 font-semibold mb-2">Access Denied</p>
          <p className="text-white/70 text-sm">
            Only the trusted admin wallet can access this page.
          </p>
          <p className="text-white/50 text-xs mt-2">
            Trusted Admin: {trustedAdminAddress}
          </p>
          <p className="text-white/50 text-xs">
            Your Wallet: {wallet.toBase58()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking Pool Admin</h1>
        <p className="text-xs sm:text-sm text-white/60">Manage staking pool configuration</p>
      </div>

      {/* Current Pool Configuration */}
      {stakingPool && (
        <div className="rounded-2xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/60 mb-1">Admin</p>
              <p className="text-sm text-white font-mono">{stakingPool.admin.toBase58()}</p>
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
          </div>
        </div>
      )}

      {/* Update Form */}
      <div className="rounded-2xl border border-white/10 bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Update Configuration</h2>
        
        <div className="space-y-4">
          {/* New Admin */}
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

          {/* New Stake Epoch Cycles */}
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

          {/* New Reward Cycle Seconds */}
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

          {/* New APY */}
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

          {/* Is Active */}
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

          {/* Success/Error Messages */}
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

          {/* Update Button */}
          <button
            onClick={handleUpdate}
            disabled={isLoading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Updating..." : "Update Pool Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

