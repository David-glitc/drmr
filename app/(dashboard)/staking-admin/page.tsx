"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useAdminVerification } from "../../../hooks/useAdminVerification";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPasswordModal } from "../../../components/AdminPasswordModal";
import { PublicKey } from "@solana/web3.js";

type Tab = "monitoring" | "pool-details" | "manage-pool" | "fund-rewards" | "initialize-pool" | "close-pool" | "users" | "platform-stats";

// User interface for platform admin
interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  isAdmin: boolean;
  isActive: boolean;
  totalStaked: number;
  totalRewards: number;
  totalTransactions: number;
  lastActiveAt?: string;
  createdAt: string;
  _count: {
    activities: number;
    userData: number;
  };
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalActivities: number;
  totalStaked: number;
  recentUsers: User[];
  topUsers: User[];
  activityStats: Array<{ action: string; count: number }>;
}

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
    fundRewards,
    fetchAllStakers,
    isLoading,
    error
  } = useDrmrStaking();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("monitoring");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Form state for initialize pool
  const [initDrmrMint, setInitDrmrMint] = useState("");
  const [initApyBps, setInitApyBps] = useState("");
  const [initMaxStakeEpochCycles, setInitMaxStakeEpochCycles] = useState("");

  // Form state for manage pool
  const [addAdmin, setAddAdmin] = useState("");
  const [removeAdmin, setRemoveAdmin] = useState("");
  const [newStakeEpochCycles, setNewStakeEpochCycles] = useState("");
  const [newRewardCycleSeconds, setNewRewardCycleSeconds] = useState("");
  const [newApyBps, setNewApyBps] = useState("");
  const [newIsActive, setNewIsActive] = useState<boolean | null>(true);

  // Form state for fund rewards
  const [fundAmount, setFundAmount] = useState("");

  // Platform admin state
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch staking pool data
  const { data: stakingPool } = useQuery({
    queryKey: ["staking-pool"],
    queryFn: fetchStakingPool,
    refetchInterval: 30000,
  });

  // isVerified = wallet is an admin wallet (required for WRITE access)
  // passwordVerified = user knows the password (required for READ access)
  const isVerified = useMemo(() => {
    if (!wallet) return false;
    
    // Check if wallet is the primary admin
    if (isAdmin) return true;
    
    // Check if wallet is in the pool admins array
    if (stakingPool?.admins) {
      const walletAddress = wallet.toBase58();
      return stakingPool.admins.some(admin => admin.toBase58() === walletAddress);
    }
    
    return false;
  }, [wallet, isAdmin, stakingPool]);

  // Fetch all stakers
  const { data: allStakers, isLoading: isLoadingStakers } = useQuery({
    queryKey: ["all-stakers"],
    queryFn: fetchAllStakers,
    enabled: passwordVerified && !!stakingPool,
    refetchInterval: 30000,
  });

  // Platform admin - Fetch stats
  const { data: platformStats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: passwordVerified,
    refetchInterval: 30000,
  });

  // Platform admin - Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", usersPage, usersSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: "20",
        ...(usersSearch && { search: usersSearch }),
      });
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: passwordVerified,
  });

  // Platform admin - Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  // Platform admin - Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  const handleUpdateUser = (user: User, updates: Partial<User>) => {
    updateUserMutation.mutate({ id: user.id, data: updates });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

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

  const handlePasswordSuccess = useCallback(() => {
    setPasswordVerified(true);
    setPasswordModalOpen(false);
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
      setErrorMessage("Only an admin wallet can initialize the pool");
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
      setErrorMessage("Only an admin wallet can update pool configuration");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const tx = await updatePoolConfig(
        addAdmin || null,
        removeAdmin || null,
        newStakeEpochCycles ? parseInt(newStakeEpochCycles) : null,
        newRewardCycleSeconds ? parseInt(newRewardCycleSeconds) : null,
        newApyBps ? parseInt(newApyBps) : null,
        newIsActive
      );

      setSuccessMessage(`Pool configuration updated! Transaction: ${tx}`);

      setAddAdmin("");
      setRemoveAdmin("");
      setNewStakeEpochCycles("");
      setNewRewardCycleSeconds("");
      setNewApyBps("");
      setNewIsActive(true);

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
      setErrorMessage("Only an admin wallet can close the pool");
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

  // Access Control:
  // - passwordVerified = Can VIEW (read-only) the admin panel
  // - isVerified (isAdmin) = Can WRITE (modify) pool settings

  // Effect to show password modal on page load if not authenticated
  useEffect(() => {
    if (!passwordVerified) {
      setPasswordModalOpen(true);
    }
  }, [passwordVerified]);

  if (!passwordVerified) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Staking Admin</h1>
          <p className="text-xs sm:text-sm text-white/60">Password required to view admin panel</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#001229] p-8 text-center">
          <p className="text-white/70 mb-4">Please enter the admin password to view staking metrics and configurations.</p>
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="rounded-xl border border-blue-500/50 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500/20"
          >
            Enter Password
          </button>
        </div>

        <AdminPasswordModal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={handlePasswordSuccess}
          onVerifyPassword={verifyPassword}
        />
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
          <div className="rounded-2xl border border-white/10 bg-[#001229] p-8">
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

        {/* Access level banner */}
        {passwordVerified && (
          <div className={`rounded-2xl border p-4 ${isVerified
            ? "border-green-500/30 bg-green-500/10"
            : "border-yellow-500/30 bg-yellow-500/10"
            }`}>
            {isVerified ? (
              <>
                <p className="text-green-400 font-semibold mb-1">✓ Full Admin Access</p>
                <p className="text-white/70 text-sm">
                  You have full read &amp; write access. You can view metrics and modify pool settings.
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-400 font-semibold mb-1">👁 Read-Only Access</p>
                <p className="text-white/70 text-sm">
                  You can view staking metrics and configurations, but cannot modify pool settings.
                </p>
                <p className="text-white/50 text-xs mt-2">
                  Admin access required. Your wallet must be listed as an admin in the pool configuration.
                  {wallet && (
                    <> | Your Wallet: {wallet.toBase58().slice(0, 8)}...{wallet.toBase58().slice(-8)}</>
                  )}
                </p>
              </>
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

        {/* Tabs - Organized by category */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-px">
          {/* STAKING TABS */}
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-white/40 px-2 uppercase tracking-wider">Staking</span>
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "monitoring"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              Stakers
            </button>
            <button
              onClick={() => setActiveTab("pool-details")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "pool-details"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              Pool
            </button>
            <button
              onClick={() => setActiveTab("manage-pool")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "manage-pool"
                ? "border-b-2 border-white text-white bg-white/10"
                : isVerified ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/40"
                }`}
            >
              {!isVerified && "🔒 "}Config
            </button>
            <button
              onClick={() => setActiveTab("fund-rewards")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "fund-rewards"
                ? "border-b-2 border-green-500 text-green-400 bg-green-500/10"
                : isVerified ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/40"
                }`}
            >
              {!isVerified && "🔒 "}Fund
            </button>
            <button
              onClick={() => setActiveTab("initialize-pool")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "initialize-pool"
                ? "border-b-2 border-yellow-500 text-yellow-400 bg-yellow-500/10"
                : isVerified ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/40"
                }`}
            >
              {!isVerified && "🔒 "}Init
            </button>
            <button
              onClick={() => setActiveTab("close-pool")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "close-pool"
                ? "border-b-2 border-red-500 text-red-400 bg-red-500/10"
                : isVerified ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/40"
                }`}
            >
              {!isVerified && "🔒 "}Close
            </button>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/10 mx-2 self-stretch" />

          {/* PLATFORM TABS */}
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-white/40 px-2 uppercase tracking-wider">Platform</span>
            <button
              onClick={() => setActiveTab("platform-stats")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "platform-stats"
                ? "border-b-2 border-purple-500 text-purple-400 bg-purple-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-t ${activeTab === "users"
                ? "border-b-2 border-purple-500 text-purple-400 bg-purple-500/10"
                : isVerified ? "text-white/60 hover:text-white hover:bg-white/5" : "text-white/40"
                }`}
            >
              {!isVerified && "🔒 "}Users
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "monitoring" && (
          <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
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
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Accrued Rewards</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Total Rewards Claimed</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Stake Periods</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Staked At</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">Stake End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStakers.map((staker) => {
                      // Calculate accrued rewards (rewards that have accrued since last claim but haven't been calculated via get_reward)
                      const calculateAccruedRewards = () => {
                        if (!stakingPool || Number(staker.amount) === 0) return 0;

                        const now = Math.floor(Date.now() / 1000);
                        const lastClaim = Number(staker.lastClaim);
                        const timeElapsedSeconds = Math.max(0, now - lastClaim);

                        // Minimum 5 minutes (300 seconds) required for rewards (same as contract)
                        if (timeElapsedSeconds < 300) return 0;

                        // Use same calculation as contract: (staked_amount * apy_bps * time_elapsed * PRECISION) / (BASIS_POINTS * seconds_per_year)
                        const BASIS_POINTS = 10000;
                        const PRECISION = 1_000_000_000;
                        const SECONDS_PER_YEAR = 31_557_600;

                        const stakedAmount = Number(staker.amount);
                        const apyBps = stakingPool.apyBps;

                        // Calculate with high precision to avoid rounding errors
                        const numerator = stakedAmount * apyBps * timeElapsedSeconds * PRECISION;
                        const denominator = BASIS_POINTS * SECONDS_PER_YEAR;
                        const rewardWithPrecision = Math.floor(numerator / denominator);
                        const reward = Math.floor(rewardWithPrecision / PRECISION);

                        return reward;
                      };

                      const accruedRewards = calculateAccruedRewards();
                      const availableRewards = Number(staker.availableRewards);
                      const totalAvailable = availableRewards + accruedRewards;

                      return (
                        <tr key={staker.publicKey.toBase58()} className="border-b border-white/5">
                          <td className="py-3 px-4 text-white font-mono text-xs">
                            {staker.user.toBase58().slice(0, 8)}...{staker.user.toBase58().slice(-8)}
                          </td>
                          <td className="py-3 px-4 text-white text-right">
                            {(Number(staker.amount) / 1e9).toFixed(2)} DRMR
                          </td>
                          <td className="py-3 px-4 text-white text-right">
                            {(availableRewards / 1e9).toFixed(2)} DRMR
                          </td>
                          <td className="py-3 px-4 text-white text-right">
                            <span className={accruedRewards > 0 ? "text-yellow-400" : ""}>
                              {(accruedRewards / 1e9).toFixed(2)} DRMR
                            </span>
                            {accruedRewards > 0 && (
                              <span className="text-xs text-white/50 ml-1">(pending)</span>
                            )}
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
                      );
                    })}
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
              <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Pool Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-xs text-white/60 mb-1">Admins ({stakingPool.admins.length}/3)</p>
                    <div className="space-y-1">
                      {stakingPool.admins.map((admin, index) => (
                        <div key={admin.toBase58()} className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/60'}`}>
                            {index === 0 ? 'Primary' : `Admin ${index + 1}`}
                          </span>
                          <p className="text-sm text-white font-mono">{admin.toBase58()}</p>
                        </div>
                      ))}
                    </div>
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
              <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Update Configuration</h2>

                <div className="space-y-4">
                  {/* Admin Management Section */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-white/80">Admin Management</h3>
                    
                    {/* Current Admins Display */}
                    <div>
                      <p className="text-xs text-white/60 mb-2">Current Admins ({stakingPool.admins.length}/3)</p>
                      <div className="space-y-1">
                        {stakingPool.admins.map((admin, index) => (
                          <div key={admin.toBase58()} className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/60'}`}>
                              {index === 0 ? 'Primary' : `#${index + 1}`}
                            </span>
                            <span className="text-white/80 font-mono truncate">{admin.toBase58()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Admin */}
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Add New Admin (optional)</label>
                      <input
                        type="text"
                        value={addAdmin}
                        onChange={(e) => setAddAdmin(e.target.value)}
                        placeholder={stakingPool.admins.length >= 3 ? "Maximum admins reached (3)" : "Enter wallet address to add as admin"}
                        disabled={stakingPool.admins.length >= 3}
                        className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {stakingPool.admins.length < 3 && (
                        <p className="text-xs text-white/50 mt-1">Can add {3 - stakingPool.admins.length} more admin(s)</p>
                      )}
                    </div>

                    {/* Remove Admin Dropdown */}
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Remove Admin (optional)</label>
                      <select
                        value={removeAdmin}
                        onChange={(e) => setRemoveAdmin(e.target.value)}
                        disabled={stakingPool.admins.length <= 1}
                        className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select admin to remove...</option>
                        {stakingPool.admins.slice(1).map((admin, index) => (
                          <option key={admin.toBase58()} value={admin.toBase58()}>
                            Admin #{index + 2}: {admin.toBase58().slice(0, 8)}...{admin.toBase58().slice(-8)}
                          </option>
                        ))}
                      </select>
                      {stakingPool.admins.length <= 1 && (
                        <p className="text-xs text-yellow-400 mt-1">Cannot remove the only admin</p>
                      )}
                      {stakingPool.admins.length > 1 && (
                        <p className="text-xs text-white/50 mt-1">Primary admin cannot be removed</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New Max Stake Epoch Cycles (optional)</label>
                    <input
                      type="number"
                      value={newStakeEpochCycles}
                      onChange={(e) => setNewStakeEpochCycles(e.target.value)}
                      placeholder={stakingPool?.stakeEpochCycles.toString() || "Current value"}
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">New Reward Cycle Seconds (optional)</label>
                    <input
                      type="number"
                      value={newRewardCycleSeconds}
                      onChange={(e) => setNewRewardCycleSeconds(e.target.value)}
                      placeholder={stakingPool?.rewardCycleSeconds.toString() || "Current value"}
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
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
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <p className="text-xs text-white/50 mt-1">10000 = 100%, 1000 = 10%, Max: 10000</p>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Pool Active Status (optional)</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setNewIsActive(true)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${newIsActive === true
                          ? "border-green-500 bg-green-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setNewIsActive(false)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${newIsActive === false
                          ? "border-red-500 bg-red-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                      >
                        Inactive
                      </button>
                      <button
                        onClick={() => setNewIsActive(null)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${newIsActive === null
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
                      Only an admin wallet can update pool configuration
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "fund-rewards" && (
          <div className="space-y-6">
            {!stakingPool ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                <p className="text-white/70 mb-4">The staking pool has not been initialized yet. Initialize the pool first before funding rewards.</p>
                <button
                  onClick={() => setActiveTab("initialize-pool")}
                  className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-yellow-500/20"
                >
                  Go to Initialize Pool
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-green-400">Pre-funded Reward Vault</h3>
                  </div>
                  <p className="text-sm text-white/70">
                    The reward vault must be pre-funded with DRMR tokens. User stakes are kept separate in the stake vault,
                    and rewards are paid out from this reward vault. This ensures user principal is always safe.
                  </p>
                </div>

                {/* Current Reward Vault Balance */}
                <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Reward Vault Status</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-xs text-white/60 mb-1">Rewards In Pool (Reserved)</p>
                      <p className="text-xl font-semibold text-yellow-400">
                        {(Number(stakingPool.rewardsInPool) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} DRMR
                      </p>
                      <p className="text-xs text-white/50 mt-1">Claimed but not yet withdrawn</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-xs text-white/60 mb-1">Total Rewards Distributed</p>
                      <p className="text-xl font-semibold text-white">
                        {(Number(stakingPool.totalRewardsDistributed) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} DRMR
                      </p>
                      <p className="text-xs text-white/50 mt-1">All-time claimed rewards</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-xs text-white/60 mb-1">Total Staked</p>
                      <p className="text-xl font-semibold text-blue-400">
                        {(Number(stakingPool.totalStaked) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} DRMR
                      </p>
                      <p className="text-xs text-white/50 mt-1">At {stakingPool.apyBps / 100}% APY</p>
                    </div>
                  </div>
                </div>

                {/* Fund Form */}
                <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Fund Reward Vault</h2>
                  <p className="text-sm text-white/70 mb-6">
                    Transfer DRMR tokens from your wallet to the reward vault. These tokens will be used to pay staking rewards.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Amount (DRMR)</label>
                      <input
                        type="text"
                        value={fundAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setFundAmount(value);
                          }
                        }}
                        placeholder="Enter amount to fund"
                        className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-green-500/50"
                      />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {[1000, 10000, 100000, 1000000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setFundAmount(amount.toString())}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          {amount.toLocaleString()} DRMR
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        if (!fundAmount || parseFloat(fundAmount) <= 0) {
                          setErrorMessage("Please enter a valid amount");
                          return;
                        }

                        // Use the mint from the initialized pool
                        const drmrMint = stakingPool?.drmrMint?.toBase58();
                        if (!drmrMint) {
                          setErrorMessage("Staking pool not initialized or mint not found");
                          return;
                        }

                        try {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          const tx = await fundRewards(parseFloat(fundAmount), drmrMint);
                          setSuccessMessage(`Successfully funded ${fundAmount} DRMR! TX: ${tx.slice(0, 8)}...`);
                          setFundAmount("");
                        } catch (err: any) {
                          setErrorMessage(err.message || "Failed to fund rewards");
                        }
                      }}
                      disabled={isLoading || !isVerified || !fundAmount || !stakingPool}
                      className="w-full rounded-xl border border-green-500/50 bg-green-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Funding..." : `Fund ${fundAmount || "0"} DRMR`}
                    </button>

                    {!isVerified && (
                      <p className="text-xs text-yellow-400 text-center">
                        Only an admin wallet can fund rewards
                      </p>
                    )}
                  </div>
                </div>

                {/* Estimated Requirements */}
                <div className="rounded-2xl border border-white/10 bg-[#001229] p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Funding Calculator</h2>
                  <p className="text-sm text-white/70 mb-4">
                    Estimate how much you need to fund based on expected staking activity.
                  </p>
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Current Total Staked:</span>
                        <span className="text-white ml-2">
                          {(Number(stakingPool.totalStaked) / 1e9).toLocaleString()} DRMR
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">APY:</span>
                        <span className="text-white ml-2">{stakingPool.apyBps / 100}%</span>
                      </div>
                      <div>
                        <span className="text-white/60">Annual Rewards Needed:</span>
                        <span className="text-green-400 ml-2">
                          ~{((Number(stakingPool.totalStaked) / 1e9) * (stakingPool.apyBps / 10000)).toLocaleString(undefined, { maximumFractionDigits: 0 })} DRMR
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Monthly Rewards Needed:</span>
                        <span className="text-green-400 ml-2">
                          ~{((Number(stakingPool.totalStaked) / 1e9) * (stakingPool.apyBps / 10000) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} DRMR
                        </span>
                      </div>
                    </div>
                  </div>
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
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">APY in Basis Points *</label>
                    <input
                      type="number"
                      value={initApyBps}
                      onChange={(e) => setInitApyBps(e.target.value)}
                      placeholder="1000 (10%)"
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
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
                      className="w-full rounded-xl border border-white/10 bg-[#000d1f] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
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
                      Only an admin wallet can initialize the pool
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
                          Only an admin wallet can close the pool
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "platform-stats" && (
          <div className="space-y-6">
            {/* Smart Contract Stats (Primary Source of Truth) */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Smart Contract Statistics</h2>
                <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">Live On-Chain Data</span>
              </div>

              {stakingPool ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total Staked (Contract) */}
                  <div className="rounded-xl bg-[#001229] p-4 border border-white/10">
                    <p className="text-xs text-white/60">Total Staked</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {(Number(stakingPool.totalStaked) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} DRMR
                    </p>
                    <p className="mt-1 text-xs text-green-400">Verified on-chain</p>
                  </div>

                  {/* Total Stakers (Contract) */}
                  <div className="rounded-xl bg-[#001229] p-4 border border-white/10">
                    <p className="text-xs text-white/60">Total Stakers</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {stakingPool.totalStakers.toString()}
                    </p>
                    <p className="mt-1 text-xs text-green-400">Active wallets</p>
                  </div>

                  {/* Rewards Distributed (Contract) */}
                  <div className="rounded-xl bg-[#001229] p-4 border border-white/10">
                    <p className="text-xs text-white/60">Rewards Distributed</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {(Number(stakingPool.totalRewardsDistributed) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} DRMR
                    </p>
                    <p className="mt-1 text-xs text-white/50">All-time claimed</p>
                  </div>

                  {/* Rewards In Pool (Contract) */}
                  <div className="rounded-xl bg-[#001229] p-4 border border-white/10">
                    <p className="text-xs text-white/60">Rewards Reserve</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {(Number(stakingPool.rewardsInPool) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} DRMR
                    </p>
                    <p className="mt-1 text-xs text-white/50">Available for payout</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#001229] p-6 text-center border border-white/10">
                  <p className="text-white/70">Contract data not available. The staking pool might not be initialized yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#001229] p-4 sm:p-6">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-white">Users</h2>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-white/10 bg-[#000d1f] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-blue-500/50 focus:outline-none"
                />
              </div>

              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg border border-white/10 bg-[#000d1f]"
                    />
                  ))}
                </div>
              ) : usersData?.users?.length > 0 ? (
                <>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-xs text-white/60">
                            <th className="pb-3 pr-2 sm:pr-4">Wallet</th>
                            <th className="pb-3 pr-2 sm:pr-4 hidden sm:table-cell">Username</th>
                            <th className="pb-3 pr-2 sm:pr-4 hidden md:table-cell">Email</th>
                            <th className="pb-3 pr-2 sm:pr-4">Staked</th>
                            <th className="pb-3 pr-2 sm:pr-4 hidden lg:table-cell">Activities</th>
                            <th className="pb-3 pr-2 sm:pr-4">Status</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersData.users.map((user: User) => (
                            <tr
                              key={user.id}
                              className="border-b border-white/5 text-sm hover:bg-white/5"
                            >
                              <td className="py-3 pr-2 sm:pr-4">
                                <div className="font-mono text-xs text-white">
                                  <span className="hidden sm:inline">
                                    {user.walletAddress.slice(0, 6)}...
                                    {user.walletAddress.slice(-4)}
                                  </span>
                                  <span className="sm:hidden">
                                    {user.walletAddress.slice(0, 4)}...
                                    {user.walletAddress.slice(-2)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-2 sm:pr-4 text-white/70 hidden sm:table-cell">
                                {user.username || "—"}
                              </td>
                              <td className="py-3 pr-2 sm:pr-4 text-white/70 hidden md:table-cell">
                                {user.email || "—"}
                              </td>
                              <td className="py-3 pr-2 sm:pr-4 text-white">
                                <span className="text-xs sm:text-sm">{user.totalStaked.toFixed(2)} DRMR</span>
                              </td>
                              <td className="py-3 pr-2 sm:pr-4 text-white/70 hidden lg:table-cell">
                                {user._count.activities}
                              </td>
                              <td className="py-3 pr-2 sm:pr-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                                  {user.isAdmin && (
                                    <span className="rounded-full bg-red-500/20 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-red-400">
                                      Admin
                                    </span>
                                  )}
                                  {user.isActive ? (
                                    <span className="rounded-full bg-green-500/20 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-green-400">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-white/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white/60">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="rounded-lg border border-white/10 bg-[#000d1f] px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-white transition hover:border-blue-500/50"
                                  >
                                    View
                                  </button>
                                  {isVerified && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateUser(user, { isActive: !user.isActive })}
                                        className="rounded-lg border border-white/10 bg-[#000d1f] px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-white transition hover:border-blue-500/50"
                                      >
                                        <span className="hidden sm:inline">{user.isActive ? "Deactivate" : "Activate"}</span>
                                        <span className="sm:hidden">{user.isActive ? "Off" : "On"}</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-red-400 transition hover:border-red-500/50"
                                      >
                                        Del
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {usersData.pagination && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <p className="text-xs text-white/60">
                        Page {usersData.pagination.page} of {usersData.pagination.totalPages} ({usersData.pagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                          className="rounded-lg border border-white/10 bg-[#000d1f] px-3 py-1 text-xs text-white transition hover:border-blue-500/50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setUsersPage((p) => Math.min(usersData.pagination.totalPages, p + 1))}
                          disabled={usersPage === usersData.pagination.totalPages}
                          className="rounded-lg border border-white/10 bg-[#000d1f] px-3 py-1 text-xs text-white transition hover:border-blue-500/50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-sm text-white/60">No users found</p>
              )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
              <UserDetailModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onUpdate={isVerified ? handleUpdateUser : undefined}
              />
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

// User Detail Modal Component
function UserDetailModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate?: (user: User, updates: Partial<User>) => void;
}) {
  const [email, setEmail] = useState(user.email || "");
  const [username, setUsername] = useState(user.username || "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(user, { email, username, isAdmin, isActive });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#001229] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60">Wallet Address</label>
            <p className="mt-1 font-mono text-sm text-white">
              {user.walletAddress}
            </p>
          </div>

          <div>
            <label className="text-xs text-white/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!onUpdate}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#000d1f] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!onUpdate}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#000d1f] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                disabled={!onUpdate}
                className="rounded border-white/10"
              />
              <span className="text-sm text-white">Admin</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!onUpdate}
                className="rounded border-white/10"
              />
              <span className="text-sm text-white">Active</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/60">Total Staked</label>
              <p className="mt-1 text-sm text-white">
                {user.totalStaked.toFixed(2)} DRMR
              </p>
            </div>
            <div>
              <label className="text-xs text-white/60">Total Rewards</label>
              <p className="mt-1 text-sm text-white">
                {user.totalRewards.toFixed(2)} DRMR
              </p>
            </div>
            <div>
              <label className="text-xs text-white/60">Activities</label>
              <p className="mt-1 text-sm text-white">
                {user._count.activities}
              </p>
            </div>
            <div>
              <label className="text-xs text-white/60">User Data</label>
              <p className="mt-1 text-sm text-white">{user._count.userData}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-[#000d1f] px-4 py-2 text-sm text-white transition hover:border-blue-500/50"
            >
              {onUpdate ? "Cancel" : "Close"}
            </button>
            {onUpdate && (
              <button
                onClick={handleSave}
                className="rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/30"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
