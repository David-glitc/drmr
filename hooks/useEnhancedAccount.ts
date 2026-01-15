"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { walletAddressAtom, autoRefreshAtom, refreshIntervalAtom, networkAtom } from "../lib/state/index";
import { onChainFetcher } from "../lib/onchain/fetcher";

/**
 * Enhanced Account Hook
 * 
 * Provides optimized account data fetching with:
 * - Intelligent caching
 * - Automatic refresh
 * - Error handling
 * - Optimistic updates
 */
export function useEnhancedAccount() {
  const walletAddress = useAtomValue(walletAddressAtom);
  const network = useAtomValue(networkAtom);
  const { connection } = useConnection();
  const autoRefresh = useAtomValue(autoRefreshAtom);
  const refreshInterval = useAtomValue(refreshIntervalAtom);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["enhanced-account", walletAddress, network],
    queryFn: async () => {
      if (!walletAddress) return null;

      return onChainFetcher.fetchAccountInfo(connection, walletAddress, {
        cache: true,
        cacheTTL: 300000,
        retries: 3,
      });
    },
    enabled: Boolean(walletAddress),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 300000, // Consider data stale after 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refresh = useCallback(() => {
    if (walletAddress) {
      // Invalidate cache and refetch
      queryClient.invalidateQueries({ queryKey: ["enhanced-account", walletAddress, network] });
    }
  }, [walletAddress, network, queryClient]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    refresh,
    isRefetching: query.isRefetching,
  };
}

