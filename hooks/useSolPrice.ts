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
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      if (!response.ok) {
        console.error("[useSolPrice] Failed to fetch SOL price. Status:", response.status);
        throw new Error("Failed to fetch SOL price");
      }
      const data = (await response.json()) as SolPriceResponse;
      const price = data.solana.usd;
      console.log("[useSolPrice] SOL price retrieved:", price, "USD");
      return price;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}


