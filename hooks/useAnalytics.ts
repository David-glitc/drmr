"use client";

import { useQuery } from "@tanstack/react-query";

import { analyticsService } from "../lib/services";

export function useAnalytics() {
  const query = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsService.fetchAnalytics(),
  });

  return {
    heroStats: query.data?.heroStats ?? [],
    tvlSeries: query.data?.tvlSeries ?? [],
    allocation: query.data?.allocation ?? [],
    reload: query.refetch,
    isLoading: query.isLoading,
  };
}

