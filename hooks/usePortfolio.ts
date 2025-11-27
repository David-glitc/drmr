"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { portfolioService } from "../lib/services";
import { walletStatusAtom } from "../lib/state";

export function usePortfolio() {
  const walletStatus = useAtomValue(walletStatusAtom);

  const query = useQuery({
    queryKey: ["portfolio", walletStatus],
    queryFn: () => portfolioService.fetchPortfolio(),
    enabled: walletStatus === "connected",
  });

  return {
    tokens: query.data?.tokens ?? [],
    nfts: query.data?.nfts ?? [],
    activity: query.data?.activity ?? [],
    reload: query.refetch,
    isLoaded: Boolean(query.data),
    isLoading: query.isLoading,
  };
}

