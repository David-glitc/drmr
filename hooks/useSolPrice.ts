"use client";

import { useQuery } from "@tanstack/react-query";

interface SolPriceResponse {
  solana: {
    usd: number;
  };
}

export function useSolPrice() {
  return useQuery({
    queryKey: ["sol-price"],
    queryFn: async () => {
      console.log("[useSolPrice] Fetching SOL price from CoinGecko...");
      
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
          {
            // Add headers to reduce rate limiting
            headers: {
              "Accept": "application/json",
            },
          }
        );
        
        if (!response.ok) {
          // Handle rate limiting gracefully
          if (response.status === 429) {
            console.warn("[useSolPrice] Rate limited by CoinGecko. Using cached data if available.");
            // Return null to use cached data, don't throw error
            return null;
          }
          console.error("[useSolPrice] Failed to fetch SOL price. Status:", response.status);
          throw new Error(`Failed to fetch SOL price: ${response.status}`);
        }
        
        const data = (await response.json()) as SolPriceResponse;
        const price = data.solana.usd;
        console.log("[useSolPrice] SOL price retrieved:", price, "USD");
        return price;
      } catch (error) {
        console.error("[useSolPrice] Error fetching SOL price:", error);
        // Return null instead of throwing to allow using cached data
        return null;
      }
    },
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 1 minute to avoid rate limits)
    staleTime: 180000, // Consider data stale after 3 minutes
    retry: 2, // Retry up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Keep previous data on error to avoid UI flickering
    placeholderData: (previousData) => previousData,
  });
}


