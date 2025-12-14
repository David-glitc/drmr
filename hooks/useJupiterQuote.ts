"use client";

import { useQuery } from "@tanstack/react-query";

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // in base units
  slippageBps?: number;
  enabled?: boolean;
}

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpactPct: string;
  routePlan: any[];
}

/**
 * Hook for fetching Jupiter swap quotes
 */
export function useJupiterQuote(params: QuoteParams) {
  const { inputMint, outputMint, amount, slippageBps = 50, enabled = true } = params;

  return useQuery<QuoteResponse | null>({
    queryKey: ["jupiter-quote", inputMint, outputMint, amount, slippageBps],
    queryFn: async () => {
      if (!inputMint || !outputMint || !amount || parseFloat(amount) <= 0) {
        return null;
      }

      const url = new URL("/api/jupiter/quote", window.location.origin);
      url.searchParams.set("inputMint", inputMint);
      url.searchParams.set("outputMint", outputMint);
      url.searchParams.set("amount", amount);
      url.searchParams.set("slippageBps", slippageBps.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }

      return await response.json();
    },
    enabled: enabled && Boolean(inputMint && outputMint && amount && parseFloat(amount) > 0),
    staleTime: 10000, // 10 seconds
    gcTime: 30000, // 30 seconds
    retry: 2,
  });
}

