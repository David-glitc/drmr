"use client";

import { useQuery } from "@tanstack/react-query";

interface PriceResponse {
  data: Record<string, {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  }>;
  timeTaken: number;
}

/**
 * Hook for fetching token prices from Jupiter
 */
export function useJupiterPrice(mints: string[], enabled = true) {
  return useQuery<PriceResponse | null>({
    queryKey: ["jupiter-price", mints.sort().join(",")],
    queryFn: async () => {
      if (!mints.length) return null;

      const url = new URL("/api/jupiter/price", window.location.origin);
      url.searchParams.set("ids", mints.join(","));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      return await response.json();
    },
    enabled: enabled && mints.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
  });
}

