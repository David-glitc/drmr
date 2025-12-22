"use client";

import { useCallback, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "./useWallet";
import { useConnection } from "@solana/wallet-adapter-react";
import { SolanaStakingService } from "../lib/services/solana-staking-service";

/**
 * Hook for Solana staking operations
 * 
 * Provides methods to create stake accounts, delegate to validators,
 * deactivate stakes, and withdraw funds.
 */
export function useSolanaStaking() {
  const { publicKey, signTransaction, sendTransaction, isConnected } = useWallet();
  const { connection } = useConnection();

  const stakingService = useMemo(() => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      return null;
    }
    return new SolanaStakingService(connection, publicKey, signTransaction, sendTransaction);
  }, [publicKey, signTransaction, sendTransaction, connection]);

  const createStakeAccount = useCallback(
    async (amountSol: number) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      return await stakingService.createStakeAccount(amountSol);
    },
    [stakingService]
  );

  const delegateStake = useCallback(
    async (stakePubkey: PublicKey | string, votePubkey: string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      const stakeKey = typeof stakePubkey === "string" ? new PublicKey(stakePubkey) : stakePubkey;
      return await stakingService.delegateStake(stakeKey, votePubkey);
    },
    [stakingService]
  );

  const createAndDelegateStake = useCallback(
    async (amountSol: number, votePubkey: string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      return await stakingService.createAndDelegateStake(amountSol, votePubkey);
    },
    [stakingService]
  );

  const deactivateStake = useCallback(
    async (stakePubkey: PublicKey | string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      const stakeKey = typeof stakePubkey === "string" ? new PublicKey(stakePubkey) : stakePubkey;
      return await stakingService.deactivateStake(stakeKey);
    },
    [stakingService]
  );

  const withdrawStake = useCallback(
    async (stakePubkey: PublicKey | string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      const stakeKey = typeof stakePubkey === "string" ? new PublicKey(stakePubkey) : stakePubkey;
      return await stakingService.withdrawStake(stakeKey);
    },
    [stakingService]
  );

  const getStakeBalance = useCallback(
    async (stakePubkey: PublicKey | string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      const stakeKey = typeof stakePubkey === "string" ? new PublicKey(stakePubkey) : stakePubkey;
      return await stakingService.getStakeBalance(stakeKey);
    },
    [stakingService]
  );

  const getStakeStatus = useCallback(
    async (stakePubkey: PublicKey | string) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      const stakeKey = typeof stakePubkey === "string" ? new PublicKey(stakePubkey) : stakePubkey;
      return await stakingService.getStakeStatus(stakeKey);
    },
    [stakingService]
  );

  const getValidatorInfos = useCallback(
    async () => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      return await stakingService.getValidatorInfos();
    },
    [stakingService]
  );

  const getStakeAccounts = useCallback(
    async () => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      return await stakingService.getStakeAccounts();
    },
    [stakingService]
  );

  const requestAirdrop = useCallback(
    async (amountSol: number) => {
      if (!stakingService) {
        throw new Error("Wallet not connected");
      }
      return await stakingService.requestAirdrop(amountSol);
    },
    [stakingService]
  );

  return {
    isReady: isConnected && stakingService !== null,
    createStakeAccount,
    delegateStake,
    createAndDelegateStake,
    deactivateStake,
    withdrawStake,
    getStakeBalance,
    getStakeStatus,
    getValidatorInfos,
    getStakeAccounts,
    requestAirdrop,
  };
}

