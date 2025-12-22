"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useConnection } from "@solana/wallet-adapter-react";

import { portfolioService } from "../lib/services";
import { walletAddressAtom, walletStatusAtom, networkAtom } from "../lib/state";
import { useSolPrice } from "./useSolPrice";

export function usePortfolio() {
  const walletStatus = useAtomValue(walletStatusAtom);
  const walletAddress = useAtomValue(walletAddressAtom);
  const network = useAtomValue(networkAtom);
  const { connection } = useConnection();
  const { data: solPrice } = useSolPrice();

  console.log("[usePortfolio] Hook state:", {
    walletStatus,
    walletAddress,
    network,
    hasConnection: !!connection,
    solPrice,
  });

  const query = useQuery({
    queryKey: ["portfolio", walletAddress, walletStatus, solPrice, network],
    queryFn: () => {
      console.log("[usePortfolio] Fetching portfolio data for network:", network);
      return portfolioService.fetchPortfolio(walletAddress, connection, solPrice, network);
    },
    enabled: walletStatus === "connected" && Boolean(walletAddress) && Boolean(connection),
    refetchInterval: 30000, // Refetch every 30 seconds
    onSuccess: (data) => {
      console.log("[usePortfolio] Portfolio data received:", {
        tokenCount: data.tokens.length,
        nftCount: data.nfts.length,
        activityCount: data.activity.length,
      });
    },
    onError: (error) => {
      console.error("[usePortfolio] Error fetching portfolio:", error);
    },
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

