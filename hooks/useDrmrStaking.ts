"use client";

import { useState, useCallback } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
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
      const stakeAmount = new BN(amount * 1e9);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Staking failed";
      setError(errorMessage);
      throw err;
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
      const unstakeAmount = new BN(amount * 1e9);

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
        })
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

  return {
    isLoading,
    error,
    fetchStakingPool,
    fetchStaker,
    stake,
    getReward,
    withdraw,
    unstake,
    updatePoolConfig,
  };
}