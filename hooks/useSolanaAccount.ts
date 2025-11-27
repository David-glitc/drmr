"use client";

import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { getSolanaConnection } from "../lib/solana-client";

export function useSolanaAccount(address: string | null) {
  return useQuery({
    queryKey: ["solana-account", address],
    enabled: Boolean(address),
    queryFn: async () => {
      if (!address) {
        return null;
      }

      const connection = getSolanaConnection();
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
    },
  });
}


