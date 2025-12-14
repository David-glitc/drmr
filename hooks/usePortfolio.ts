"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useConnection } from "@solana/wallet-adapter-react";

import { portfolioService } from "../lib/services";
import { walletAddressAtom, walletStatusAtom } from "../lib/state";
import { useSolPrice } from "./useSolPrice";

export function usePortfolio() {
  const walletStatus = useAtomValue(walletStatusAtom);
  const walletAddress = useAtomValue(walletAddressAtom);
  const { connection } = useConnection();
  const { data: solPrice } = useSolPrice();

  const query = useQuery({
    queryKey: ["portfolio", walletAddress, walletStatus, solPrice],
    queryFn: () => portfolioService.fetchPortfolio(walletAddress, connection, solPrice),
    enabled: walletStatus === "connected" && Boolean(walletAddress) && Boolean(connection),
    refetchInterval: 30000, // Refetch every 30 seconds
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

