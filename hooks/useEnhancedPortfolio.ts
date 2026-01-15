"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { walletAddressAtom, autoRefreshAtom, refreshIntervalAtom, networkAtom } from "../lib/state/index";
import { portfolioService } from "../lib/services";
import { useSolPrice } from "./useSolPrice";
import { onChainCache } from "../lib/onchain/cache";
import { onChainFetcher } from "../lib/onchain/fetcher";

/**
 * Enhanced Portfolio Hook
 * 
 * Provides optimized portfolio data fetching with:
 * - Intelligent caching
 * - Automatic refresh
 * - Better error handling
 * - Optimistic updates
 */
export function useEnhancedPortfolio() {
  const walletAddress = useAtomValue(walletAddressAtom);
  const network = useAtomValue(networkAtom);
  const { connection } = useConnection();
  const autoRefresh = useAtomValue(autoRefreshAtom);
  const refreshInterval = useAtomValue(refreshIntervalAtom);
  const { data: solPrice } = useSolPrice();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["enhanced-portfolio", walletAddress, network, solPrice],
    queryFn: async () => {
      if (!walletAddress || !connection) {
        return {
          tokens: [],
          nfts: [],
          activity: [],
        };
      }

      // Use onChainFetcher for optimized fetching with retry and cache
      const cacheKey = `portfolio:${walletAddress}`;

      return onChainFetcher.fetch(
        cacheKey,
        async () => {
          return await portfolioService.fetchPortfolio(
            walletAddress,
            connection,
            solPrice ?? undefined,
            network
          );
        },
        {
          cache: true,
          cacheTTL: 300000, // 5 minutes cache
          retries: 2, // Retry failed requests
        }
      );
    },
    enabled: Boolean(walletAddress) && Boolean(connection),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 300000, // Consider data stale after 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refresh = useCallback(() => {
    if (walletAddress) {
      // Invalidate cache and refetch
      onChainCache.invalidate(`portfolio:${walletAddress}`);
      queryClient.invalidateQueries({ queryKey: ["enhanced-portfolio", walletAddress, network] });
    }
  }, [walletAddress, network, queryClient]);

  return {
    tokens: query.data?.tokens ?? [],
    nfts: query.data?.nfts ?? [],
    activity: query.data?.activity ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    refresh,
    isRefetching: query.isRefetching,
    isLoaded: Boolean(query.data),
  };
}

