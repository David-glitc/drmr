"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { portfolioService } from "../lib/services";
import { walletAddressAtom, walletStatusAtom, networkAtom, refreshIntervalAtom, autoRefreshAtom } from "../lib/state";
import { useSolPrice } from "./useSolPrice";

export function usePortfolio() {
  const walletStatus = useAtomValue(walletStatusAtom);
  const walletAddress = useAtomValue(walletAddressAtom);
  const network = useAtomValue(networkAtom);
  const refreshInterval = useAtomValue(refreshIntervalAtom);
  const autoRefresh = useAtomValue(autoRefreshAtom);
  const { connection } = useConnection();
  const { data: solPrice } = useSolPrice();

  const query = useQuery({
    queryKey: ["portfolio", walletAddress, walletStatus, solPrice, network],
    queryFn: () => {
      return portfolioService.fetchPortfolio(walletAddress, connection, solPrice ?? undefined, network);
    },
    enabled: walletStatus === "connected" && Boolean(walletAddress) && Boolean(connection),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });

  // Log errors only (not success, to reduce console noise)
  useEffect(() => {
    if (query.error) {
      console.error("[usePortfolio] Error fetching portfolio:", query.error);
    }
  }, [query.error]);

  return {
    tokens: query.data?.tokens ?? [],
    nfts: query.data?.nfts ?? [],
    activity: query.data?.activity ?? [],
    reload: query.refetch,
    isLoaded: Boolean(query.data),
    isLoading: query.isLoading,
  };
}

