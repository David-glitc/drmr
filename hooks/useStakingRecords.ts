"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { walletAddressAtom } from "../lib/state/atoms";

export interface StakingRecord {
  id: string;
  userId: string;
  validatorId: string;
  amount: number;
  stakeAccount: string | null;
  apy: number;
  status: string;
  totalRewards: number;
  lastRewardEpoch: string | null;
  stakedAt: string;
  unstakedAt: string | null;
  validator: {
    voteAccount: string;
    name: string;
    apy: number;
    commission: number;
  };
}

export function useStakingRecords() {
  const walletAddress = useAtomValue(walletAddressAtom);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["staking-records", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { records: [], totalStaked: 0, totalRewards: 0 };

      const response = await fetch(`/api/staking?walletAddress=${walletAddress}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staking records");
      }
      return response.json() as Promise<{
        records: StakingRecord[];
        totalStaked: number;
        totalRewards: number;
      }>;
    },
    enabled: Boolean(walletAddress),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider stale after 5 minutes
  });

  const createStakingRecord = useMutation({
    mutationFn: async (data: {
      validatorId: string;
      amount: number;
      stakeAccount?: string;
      walletAddress?: string; // Allow wallet address to be passed in
    }) => {
      // Use passed walletAddress or fall back to atom value
      const addressToUse = data.walletAddress || walletAddress;
      if (!addressToUse) throw new Error("Wallet not connected");

      const response = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: addressToUse,
          validatorId: data.validatorId,
          amount: data.amount,
          stakeAccount: data.stakeAccount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create staking record");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch staking records
      const addressToUse = variables.walletAddress || walletAddress;
      if (addressToUse) {
        queryClient.invalidateQueries({ queryKey: ["staking-records", addressToUse] });
      }
    },
  });

  return {
    records: query.data?.records || [],
    totalStaked: query.data?.totalStaked || 0,
    totalRewards: query.data?.totalRewards || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createStakingRecord: createStakingRecord.mutateAsync,
    isCreating: createStakingRecord.isPending,
  };
}

