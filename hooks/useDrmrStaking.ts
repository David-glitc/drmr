"use client";

import { useState, useCallback } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorProgram } from "../lib/contracts/anchor-client";
import {
  deriveStakingPoolPDA,
  deriveStakerPDA,
  deriveStakeVaultPDA,
  deriveRewardVaultPDA,
} from "../lib/contracts/anchor-client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export interface StakingPoolData {
  admin: PublicKey;
  drmrMint: PublicKey;
  stakeEpochCycles: BN;
  rewardCycleSeconds: BN;
  apyBps: number;
  totalStaked: BN;
  totalStakers: BN;
  totalRewardsDistributed: BN;
  rewardsInPool: BN;
  isActive: boolean;
  createdAt: BN;
  lastRewardDistribution: BN;
}

export interface StakerData {
  pool: PublicKey;
  user: PublicKey;
  amount: BN;
  stakePeriods: number;
  stakedAt: BN;
  stakeEndTime: BN;
  lastClaim: BN;
  totalRewardsClaimed: BN;
  availableRewards: BN;
  totalTokenStaked: BN;
}

export function useDrmrStaking() {
  const program = useAnchorProgram();
  const { connection } = useConnection();
  const { publicKey: wallet } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch staking pool data
  const fetchStakingPool = useCallback(async (): Promise<StakingPoolData | null> => {
    if (!program) return null;

    try {
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const poolAccount = await program.account.stakingPool.fetch(stakingPoolPDA);
      
      return {
        admin: poolAccount.admin,
        drmrMint: poolAccount.drmrMint,
        stakeEpochCycles: poolAccount.stakeEpochCycles,
        rewardCycleSeconds: poolAccount.rewardCycleSeconds,
        apyBps: poolAccount.apyBps,
        totalStaked: poolAccount.totalStaked,
        totalStakers: poolAccount.totalStakers,
        totalRewardsDistributed: poolAccount.totalRewardsDistributed,
        rewardsInPool: poolAccount.rewardsInPool,
        isActive: poolAccount.isActive,
        createdAt: poolAccount.createdAt,
        lastRewardDistribution: poolAccount.lastRewardDistribution,
      };
    } catch (err) {
      // Staking pool account might not exist yet (not initialized on-chain)
      if (err instanceof Error && (
        err.message.includes("Account does not exist") ||
        err.message.includes("has no data")
      )) {
        // Silently return null - this is expected if the pool hasn't been initialized
        return null;
      }
      // Log other errors that might be unexpected
      console.error("Error fetching staking pool:", err);
      return null;
    }
  }, [program]);

  // Fetch staker data
  const fetchStaker = useCallback(async (): Promise<StakerData | null> => {
    if (!program || !wallet) return null;

    try {
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakerPDA] = deriveStakerPDA(stakingPoolPDA, wallet);
      
      const stakerAccount = await program.account.staker.fetch(stakerPDA);
      
      return {
        pool: stakerAccount.pool,
        user: stakerAccount.user,
        amount: stakerAccount.amount,
        stakePeriods: stakerAccount.stakePeriods,
        stakedAt: stakerAccount.stakedAt,
        stakeEndTime: stakerAccount.stakeEndTime,
        lastClaim: stakerAccount.lastClaim,
        totalRewardsClaimed: stakerAccount.totalRewardsClaimed,
        availableRewards: stakerAccount.availableRewards,
        totalTokenStaked: stakerAccount.totalTokenStaked,
      };
    } catch (err) {
      // Staker account might not exist yet
      if (err instanceof Error && err.message.includes("Account does not exist")) {
        return null;
      }
      console.error("Error fetching staker:", err);
      return null;
    }
  }, [program, wallet]);

  // Fetch all stakers (admin only)
  const fetchAllStakers = useCallback(async (): Promise<Array<StakerData & { publicKey: PublicKey }>> => {
    if (!program) return [];

    try {
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      // Fetch all staker accounts and filter by pool
      const allStakerAccounts = await program.account.staker.all();

      // Filter stakers that belong to this pool and map to our format
      return allStakerAccounts
        .filter((account) => account.account.pool.equals(stakingPoolPDA))
        .map((account) => ({
          publicKey: account.publicKey,
          pool: account.account.pool,
          user: account.account.user,
          amount: account.account.amount,
          stakePeriods: account.account.stakePeriods,
          stakedAt: account.account.stakedAt,
          stakeEndTime: account.account.stakeEndTime,
          lastClaim: account.account.lastClaim,
          totalRewardsClaimed: account.account.totalRewardsClaimed,
          availableRewards: account.account.availableRewards,
          totalTokenStaked: account.account.totalTokenStaked,
        }));
    } catch (err) {
      console.error("Error fetching all stakers:", err);
      return [];
    }
  }, [program]);

  // Stake DRMR tokens
  const stake = useCallback(async (
    amount: number,
    stakePeriods: number,
    drmrMint: string
  ): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const drmrMintPubkey = new PublicKey(drmrMint);
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakerPDA] = deriveStakerPDA(stakingPoolPDA, wallet);
      const [stakeVaultPDA] = deriveStakeVaultPDA(stakingPoolPDA);
      
      // Get user's token account (ATA)
      const userTokenAccount = await getAssociatedTokenAddress(
        drmrMintPubkey,
        wallet
      );

      // Convert amount to BN (assuming 9 decimals for DRMR)
      // Use string-based conversion to avoid precision loss for large numbers
      const amountStr = amount.toString();
      const [integerPart, decimalPart = ""] = amountStr.split(".");
      
      // Pad decimal part to 9 digits and truncate if longer
      const paddedDecimal = (decimalPart + "000000000").slice(0, 9);
      const rawAmountStr = integerPart + paddedDecimal;
      
      if (rawAmountStr === "0" || rawAmountStr.startsWith("-")) {
        throw new Error("Invalid stake amount. Amount must be a positive number.");
      }
      
      const stakeAmount = new BN(rawAmountStr);

      const tx = await program.methods
        .stake(stakeAmount, stakePeriods)
        .accounts({
          stakingPool: stakingPoolPDA,
          staker: stakerPDA,
          user: wallet,
          drmrMint: drmrMintPubkey,
          userTokenAccount: userTokenAccount,
          stakeVault: stakeVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (err: any) {
      console.error("[useDrmrStaking] Stake error:", err);
      
      // Parse Anchor error messages
      let errorMessage = "Staking failed";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check for specific Anchor error codes
        if (err.message.includes("PoolInactive") || err.message.includes("pool is inactive")) {
          errorMessage = "Staking pool is not active. Please contact the admin.";
        } else if (err.message.includes("InvalidMint") || err.message.includes("Invalid mint")) {
          errorMessage = "Invalid DRMR mint address. The mint address does not match the staking pool.";
        } else if (err.message.includes("InvalidAmount") || err.message.includes("Invalid amount")) {
          errorMessage = "Invalid stake amount. Please check your balance and try again.";
        } else if (err.message.includes("InvalidStakePeriod") || err.message.includes("Invalid stake period")) {
          errorMessage = "Invalid stake period. The selected period exceeds the maximum allowed.";
        } else if (err.message.includes("Account does not exist") || err.message.includes("has no data")) {
          errorMessage = "Staking pool is not initialized. Please wait for the pool to be set up.";
        } else if (err.message.includes("assertion") || err.message.includes("Assertion failed")) {
          // Try to extract more context from the error
          const anchorError = err as any;
          if (anchorError.logs) {
            const logs = Array.isArray(anchorError.logs) ? anchorError.logs : [anchorError.logs];
            const errorLog = logs.find((log: string) => log.includes("Error") || log.includes("require"));
            if (errorLog) {
              errorMessage = `Staking failed: ${errorLog}`;
            } else {
              errorMessage = "Staking failed: One of the contract constraints was not met. Please check if the pool is initialized and active.";
            }
          } else {
            errorMessage = "Staking failed: Contract constraint violation. The pool may not be initialized or active.";
          }
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Claim rewards
  const getReward = useCallback(async (drmrMint: string): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const drmrMintPubkey = new PublicKey(drmrMint);
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakerPDA] = deriveStakerPDA(stakingPoolPDA, wallet);
      const [stakeVaultPDA] = deriveStakeVaultPDA(stakingPoolPDA);
      const [rewardVaultPDA] = deriveRewardVaultPDA(stakingPoolPDA);

      const tx = await program.methods
        .getReward()
        .accounts({
          stakingPool: stakingPoolPDA,
          staker: stakerPDA,
          user: wallet,
          stakeVault: stakeVaultPDA,
          rewardVault: rewardVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to claim rewards";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Withdraw rewards
  const withdraw = useCallback(async (drmrMint: string): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const drmrMintPubkey = new PublicKey(drmrMint);
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakerPDA] = deriveStakerPDA(stakingPoolPDA, wallet);
      const [rewardVaultPDA] = deriveRewardVaultPDA(stakingPoolPDA);

      // Get user's token account (ATA)
      const userTokenAccount = await getAssociatedTokenAddress(
        drmrMintPubkey,
        wallet
      );

      const tx = await program.methods
        .withdraw()
        .accounts({
          stakingPool: stakingPoolPDA,
          staker: stakerPDA,
          user: wallet,
          drmrMint: drmrMintPubkey,
          userTokenAccount: userTokenAccount,
          rewardVault: rewardVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to withdraw rewards";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Unstake tokens
  const unstake = useCallback(async (
    amount: number,
    drmrMint: string
  ): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const drmrMintPubkey = new PublicKey(drmrMint);
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakerPDA] = deriveStakerPDA(stakingPoolPDA, wallet);
      const [stakeVaultPDA] = deriveStakeVaultPDA(stakingPoolPDA);

      // Get user's token account (ATA)
      const userTokenAccount = await getAssociatedTokenAddress(
        drmrMintPubkey,
        wallet
      );

      // Convert amount to BN (assuming 9 decimals for DRMR)
      // Use string-based conversion to avoid precision loss for large numbers
      const amountStr = amount.toString();
      const [integerPart, decimalPart = ""] = amountStr.split(".");
      
      // Pad decimal part to 9 digits and truncate if longer
      const paddedDecimal = (decimalPart + "000000000").slice(0, 9);
      const rawAmountStr = integerPart + paddedDecimal;
      
      if (rawAmountStr === "0" || rawAmountStr.startsWith("-")) {
        throw new Error("Invalid unstake amount. Amount must be a positive number.");
      }
      
      const unstakeAmount = new BN(rawAmountStr);

      const tx = await program.methods
        .unstake(unstakeAmount)
        .accounts({
          stakingPool: stakingPoolPDA,
          staker: stakerPDA,
          user: wallet,
          drmrMint: drmrMintPubkey,
          userTokenAccount: userTokenAccount,
          stakeVault: stakeVaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unstake";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Update pool configuration (admin only)
  const updatePoolConfig = useCallback(async (
    newAdmin: string | null,
    newStakeEpochCycles: number | null,
    newRewardCycleSeconds: number | null,
    newApyBps: number | null,
    newIsActive: boolean | null
  ): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    // Verify wallet is the admin
    const TRUSTED_ADMIN_ADDRESS = "9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8";
    const walletAddress = wallet.toBase58();
    
    // Check if wallet matches trusted admin
    if (walletAddress !== TRUSTED_ADMIN_ADDRESS) {
      // Also check pool admin if pool exists
      try {
        const pool = await fetchStakingPool();
        if (pool) {
          const poolAdminAddress = pool.admin.toBase58();
          if (walletAddress !== poolAdminAddress) {
            throw new Error("Only the designated admin wallet can update pool configuration");
          }
        } else {
          throw new Error("Only the designated admin wallet can update pool configuration");
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("admin")) {
          throw err;
        }
        throw new Error("Only the designated admin wallet can update pool configuration");
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const [stakingPoolPDA] = deriveStakingPoolPDA();

      const tx = await program.methods
        .updatePoolConfig(
          newAdmin ? new PublicKey(newAdmin) : null,
          newStakeEpochCycles ? new BN(newStakeEpochCycles) : null,
          newRewardCycleSeconds ? new BN(newRewardCycleSeconds) : null,
          newApyBps || null,
          newIsActive !== null ? newIsActive : null
        )
        .accounts({
          stakingPool: stakingPoolPDA,
          admin: wallet,
        } as any)
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update pool config";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Initialize staking pool (admin only)
  const initializePool = useCallback(async (
    apyBps: number,
    maxStakeEpochCycles: number,
    drmrMint: string
  ): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    // Verify wallet is the admin
    const TRUSTED_ADMIN_ADDRESS = "9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8";
    const walletAddress = wallet.toBase58();
    
    if (walletAddress !== TRUSTED_ADMIN_ADDRESS) {
      throw new Error("Only the designated admin wallet can initialize the pool");
    }

    setIsLoading(true);
    setError(null);

    try {
      const drmrMintPubkey = new PublicKey(drmrMint);
      const [stakingPoolPDA] = deriveStakingPoolPDA();
      const [stakeVaultPDA] = deriveStakeVaultPDA(stakingPoolPDA);
      const [rewardVaultPDA] = deriveRewardVaultPDA(stakingPoolPDA);

      const tx = await program.methods
        .initialize(apyBps, new BN(maxStakeEpochCycles))
        .accounts({
          stakingPool: stakingPoolPDA,
          stakeVault: stakeVaultPDA,
          rewardVault: rewardVaultPDA,
          creator: wallet,
          drmrMint: drmrMintPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize pool";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  // Close staking pool (admin only)
  const closePool = useCallback(async (): Promise<string> => {
    if (!program || !wallet) {
      throw new Error("Wallet not connected");
    }

    // Verify wallet is the admin
    const TRUSTED_ADMIN_ADDRESS = "9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8";
    const walletAddress = wallet.toBase58();
    
    // Check if wallet matches trusted admin
    if (walletAddress !== TRUSTED_ADMIN_ADDRESS) {
      // Also check pool admin if pool exists
      try {
        const pool = await fetchStakingPool();
        if (pool) {
          const poolAdminAddress = pool.admin.toBase58();
          if (walletAddress !== poolAdminAddress) {
            throw new Error("Only the designated admin wallet can close the pool");
          }
        } else {
          throw new Error("Only the designated admin wallet can close the pool");
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("admin")) {
          throw err;
        }
        throw new Error("Only the designated admin wallet can close the pool");
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const [stakingPoolPDA] = deriveStakingPoolPDA();

      const tx = await program.methods
        .close()
        .accounts({
          stakingPool: stakingPoolPDA,
          admin: wallet,
        } as any)
        .rpc();

      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to close pool";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [program, wallet]);

  return {
    isLoading,
    error,
    fetchStakingPool,
    fetchStaker,
    fetchAllStakers,
    stake,
    getReward,
    withdraw,
    unstake,
    updatePoolConfig,
    initializePool,
    closePool,
  };
}