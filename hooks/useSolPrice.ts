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
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch SOL price");
      }
      const data = (await response.json()) as SolPriceResponse;
      return data.solana.usd;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}


