# Frontend Integration Guide: DRMR Staking Contract

This guide will walk you through connecting your Next.js frontend to the DRMR staking smart contract.

## Overview

The DRMR staking contract is an Anchor program that allows users to:
- Stake DRMR tokens for a lock-up period
- Claim rewards periodically (every 5+ minutes)
- Withdraw accumulated rewards
- Unstake tokens after the lock-up period

## Prerequisites

- Next.js frontend with wallet adapter already set up ✅
- Anchor program deployed (Program ID: `FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX`)
- IDL file generated at `contract/drmr_staking/target/idl/drmr_staking.json`
- TypeScript types generated at `contract/drmr_staking/target/types/drmr_staking.ts`

## Step 1: Install Required Dependencies

Add Anchor and SPL Token dependencies to your frontend's `package.json`:

```bash
cd /home/konquest/code_repo/development/drmr
pnpm add @coral-xyz/anchor @solana/spl-token bn.js
pnpm add -D @types/bn.js
```

## Step 2: Copy IDL and Types to Frontend

Copy the generated IDL and types to a location accessible by your frontend:

```bash
# Create a lib directory for contract artifacts if it doesn't exist
mkdir -p lib/contracts

# Copy IDL
cp contract/drmr_staking/target/idl/drmr_staking.json lib/contracts/

# Copy types (optional, but helpful for TypeScript)
cp contract/drmr_staking/target/types/drmr_staking.ts lib/contracts/
```

## Step 3: Create Anchor Program Client Utility

Create a utility file to initialize the Anchor program:

**File: `lib/contracts/anchor-client.ts`**

```typescript
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Wallet } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import idl from "./drmr_staking.json";
import type { DrmrStaking } from "./drmr_staking";

// Program ID from your contract
export const DRMR_STAKING_PROGRAM_ID = new PublicKey(
  "FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX"
);

// PDA seeds
export const STAKING_POOL_SEED = "staking_pool";
export const STAKER_SEED = "staker";
export const STAKE_VAULT_SEED = "stake_vault";
export const REWARD_VAULT_SEED = "reward_vault";
export const TRUSTED_ADMIN_SEED = "trusted_admin";

/**
 * Get the Anchor program instance
 */
export function getAnchorProgram(
  connection: Connection,
  wallet: Wallet
): Program<DrmrStaking> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new Program(idl as Idl, provider) as Program<DrmrStaking>;
}

/**
 * React hook to get the Anchor program
 */
export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    const walletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions?.bind(wallet),
    } as Wallet;

    return getAnchorProgram(connection, walletAdapter);
  }, [connection, wallet.publicKey, wallet.signTransaction]);
}

/**
 * Derive PDA addresses
 */
export function deriveStakingPoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKING_POOL_SEED)],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveStakerPDA(
  stakingPool: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKER_SEED), stakingPool.toBuffer(), user.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveStakeVaultPDA(
  stakingPool: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE_VAULT_SEED), stakingPool.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}

export function deriveRewardVaultPDA(
  stakingPool: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REWARD_VAULT_SEED), stakingPool.toBuffer()],
    DRMR_STAKING_PROGRAM_ID
  );
}
```

## Step 4: Create DRMR Staking Hook

Create a custom hook to interact with the staking contract:

**File: `hooks/useDrmrStaking.ts`**

```typescript
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

  return {
    isLoading,
    error,
    fetchStakingPool,
    fetchStaker,
    stake,
    getReward,
    withdraw,
    unstake,
  };
}
```

## Step 5: Create Token Balance Hook

Create a hook to fetch DRMR token balance:

**File: `hooks/useDrmrToken.ts`**

```typescript
"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

export function useDrmrToken(mintAddress: string | null) {
  const { connection } = useConnection();
  const { publicKey: wallet } = useWallet();

  return useQuery({
    queryKey: ["drmr-token", mintAddress, wallet?.toBase58()],
    queryFn: async () => {
      if (!mintAddress || !wallet) return null;

      try {
        const mintPubkey = new PublicKey(mintAddress);
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet);
        const account = await getAccount(connection, tokenAccount);
        
        // Assuming 9 decimals for DRMR
        return {
          balance: Number(account.amount) / 1e9,
          decimals: account.mint,
          address: tokenAccount.toBase58(),
        };
      } catch (err) {
        // Token account might not exist
        return {
          balance: 0,
          decimals: null,
          address: null,
        };
      }
    },
    enabled: !!mintAddress && !!wallet,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
```

## Step 6: Update Staking Page

Update the staking page to support DRMR staking. You'll need to:

1. Add DRMR token mint address to environment variables
2. Enable DRMR staking option
3. Integrate the `useDrmrStaking` hook
4. Add UI for staking, claiming rewards, withdrawing, and unstaking

**Key changes to `app/(dashboard)/staking/page.tsx`:**

```typescript
// Add at the top
import { useDrmrStaking } from "../../../hooks/useDrmrStaking";
import { useDrmrToken } from "../../../hooks/useDrmrToken";

// Inside component
const DRMR_MINT = process.env.NEXT_PUBLIC_DRMR_MINT || ""; // Add to .env
const { data: drmrBalance } = useDrmrToken(DRMR_MINT);
const {
  stake: stakeDrmr,
  getReward: claimReward,
  withdraw: withdrawRewards,
  unstake: unstakeDrmr,
  fetchStaker,
  fetchStakingPool,
  isLoading: isDrmrStakingLoading,
  error: drmrStakingError,
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
```

## Step 7: Environment Variables

Add to your `.env.local`:

```bash
# DRMR Token Mint Address (get this from your token creation)
NEXT_PUBLIC_DRMR_MINT=YourDRMRTokenMintAddressHere

# Solana Network (should match your contract deployment)
NEXT_PUBLIC_SOLANA_RPC_DEVNET=your-rpc-endpoint
# or
NEXT_PUBLIC_SOLANA_RPC_MAINNET=your-rpc-endpoint
```

## Step 8: Testing Checklist

1. ✅ Install dependencies
2. ✅ Copy IDL and types to frontend
3. ✅ Create anchor client utility
4. ✅ Create DRMR staking hook
5. ✅ Create token balance hook
6. ✅ Update staking page UI
7. ✅ Test wallet connection
8. ✅ Test staking DRMR tokens
9. ✅ Test claiming rewards
10. ✅ Test withdrawing rewards
11. ✅ Test unstaking (after lock-up period)

## Common Issues & Solutions

### Issue: "Account does not exist"
- **Solution**: The staker account is created on first stake. Make sure to handle this gracefully.

### Issue: "Insufficient funds"
- **Solution**: User needs SOL for transaction fees AND DRMR tokens for staking.

### Issue: "Reward cycle not ready"
- **Solution**: Users must wait at least 5 minutes between reward claims.

### Issue: "Stake period has not ended"
- **Solution**: Users cannot unstake until `stake_end_time` has passed.

## Next Steps

1. Add transaction confirmation modals
2. Add loading states for all operations
3. Add error handling and user-friendly messages
4. Add real-time balance updates
5. Add transaction history
6. Add reward calculation display
7. Add countdown timer for lock-up period

## Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)

