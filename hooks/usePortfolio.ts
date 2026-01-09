"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
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

  const query = useQuery({
    queryKey: ["portfolio", walletAddress, walletStatus, solPrice, network],
    queryFn: () => {
      return portfolioService.fetchPortfolio(walletAddress, connection, solPrice, network);
    },
    enabled: walletStatus === "connected" && Boolean(walletAddress) && Boolean(connection),
    refetchInterval: 30000, // Refetch every 30 seconds
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

