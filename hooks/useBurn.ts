"use client";

import { useQuery } from "@tanstack/react-query";

import { burnService } from "../lib/services";

export function useBurn() {
  const query = useQuery({
    queryKey: ["burn"],
    queryFn: () => burnService.fetchBurnData(),
  });

  return {
    burnCountdown: query.data?.countdown ?? "00 : 00 : 00",
    burnEvents: query.data?.events ?? [],
    reload: query.refetch,
    isLoading: query.isLoading,
  };
}

