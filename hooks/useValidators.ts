"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useConnection } from "@solana/wallet-adapter-react";
import { networkAtom } from "../lib/state/atoms";
import { ValidatorService, type ValidatorInfo } from "../lib/services/validator-service";

export function useValidators(sync: boolean = false) {
  const network = useAtomValue(networkAtom);
  const { connection } = useConnection();

  const query = useQuery({
    queryKey: ["validators", network, sync],
    queryFn: async () => {
      const response = await fetch(
        `/api/validators?network=${network}&sync=${sync}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch validators");
      }
      const data = await response.json();
      // Validators now include database IDs
      return data.validators as (ValidatorInfo & { id?: string })[];
    },
    enabled: Boolean(connection),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider stale after 5 minutes
  });

  return {
    validators: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

