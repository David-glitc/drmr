"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { walletAddressAtom, networkAtom } from "../lib/state";

export interface UseTransactionHistoryParams {
  limit?: number;
  sortOrder?: "asc" | "desc";
  status?: "succeeded" | "failed";
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  fetchAll?: boolean; // If true, fetch all available transactions
}

export interface Transaction {
  signature: string;
  blockTime: number;
  slot: number;
  status: "succeeded" | "failed";
  fee: number;
  [key: string]: any;
}

export interface TransactionHistoryResponse {
  data: Transaction[];
  total: number;
  hasMore: boolean;
}

/**
 * Hook to fetch transaction history for the connected wallet
 */
export function useTransactionHistory(params: UseTransactionHistoryParams = {}) {
  const walletAddress = useAtomValue(walletAddressAtom);
  const network = useAtomValue(networkAtom);
  const {
    limit = 100,
    sortOrder = "asc",
    status,
    startDate,
    endDate,
    enabled = true,
    fetchAll = false,
  } = params;

  // Use a higher limit if fetching all
  const actualLimit = fetchAll ? 1000 : limit;

  const query = useQuery({
    queryKey: [
      "transaction-history",
      walletAddress,
      network,
      actualLimit,
      sortOrder,
      status,
      startDate?.getTime(),
      endDate?.getTime(),
      fetchAll,
    ],
    queryFn: async () => {
      if (!walletAddress) {
        return null;
      }

      const searchParams = new URLSearchParams({
        address: walletAddress,
        limit: actualLimit.toString(),
        sortOrder,
        network,
      });

      if (status) {
        searchParams.set("status", status);
      }
      if (startDate) {
        searchParams.set("startDate", startDate.toISOString());
      }
      if (endDate) {
        searchParams.set("endDate", endDate.toISOString());
      }

      const response = await fetch(`/api/transactions?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch transaction history");
      }

      return (await response.json()) as TransactionHistoryResponse;
    },
    enabled: enabled && Boolean(walletAddress),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider stale after 5 minutes
    retry: 2,
  });

  return {
    transactions: query.data?.data || [],
    total: query.data?.total || 0,
    hasMore: query.data?.hasMore || false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
