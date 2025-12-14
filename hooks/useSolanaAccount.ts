"use client";

import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";

export function useSolanaAccount(address: string | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["solana-account", address],
    enabled: Boolean(address),
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      if (!address) {
        return null;
      }

      try {
        const publicKey = new PublicKey(address);
        const [slot, balanceLamports, accountInfo] = await Promise.all([
          connection.getSlot(),
          connection.getBalance(publicKey),
          connection.getAccountInfo(publicKey),
        ]);

        return {
          slot,
          balanceLamports,
          balanceSol: balanceLamports / LAMPORTS_PER_SOL,
          owner: accountInfo?.owner?.toBase58() ?? null,
          executable: accountInfo?.executable ?? false,
          rentEpoch: accountInfo?.rentEpoch ?? null,
        };
      } catch (error) {
        console.error("Solana RPC error:", error);
        throw error;
      }
    },
  });
}



