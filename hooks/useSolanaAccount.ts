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
        console.log("[useSolanaAccount] Fetching balance for address:", address);
        console.log("[useSolanaAccount] Connection endpoint:", (connection as any)._rpcEndpoint || "unknown");
        const publicKey = new PublicKey(address);
        console.log("[useSolanaAccount] PublicKey created:", publicKey.toBase58());
        
        const [slot, balanceLamports, accountInfo] = await Promise.all([
          connection.getSlot().catch((err) => {
            console.error("[useSolanaAccount] Error getting slot:", err);
            throw err;
          }),
          connection.getBalance(publicKey).catch((err) => {
            console.error("[useSolanaAccount] Error getting balance:", err);
            throw err;
          }),
          connection.getAccountInfo(publicKey).catch((err) => {
            console.error("[useSolanaAccount] Error getting account info:", err);
            throw err;
          }),
        ]);

        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
        
        console.log("[useSolanaAccount] Balance retrieved:", {
          slot,
          balanceLamports,
          balanceSol,
          owner: accountInfo?.owner?.toBase58() ?? null,
          executable: accountInfo?.executable ?? false,
          rentEpoch: accountInfo?.rentEpoch ?? null,
        });

        return {
          slot,
          balanceLamports,
          balanceSol,
          owner: accountInfo?.owner?.toBase58() ?? null,
          executable: accountInfo?.executable ?? false,
          rentEpoch: accountInfo?.rentEpoch ?? null,
        };
      } catch (error: any) {
        console.error("[useSolanaAccount] Solana RPC error:", error);
        console.error("[useSolanaAccount] Error details:", {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          endpoint: (connection as any)._rpcEndpoint || "unknown",
        });
        
        // Provide helpful error message for 403 errors
        if (error?.message?.includes("403") || error?.code === 403) {
          console.error("[useSolanaAccount] 403 Forbidden Error - The RPC endpoint is blocking requests.");
          console.error("[useSolanaAccount] Solution: Set NEXT_PUBLIC_SOLANA_RPC_DEVNET or NEXT_PUBLIC_SOLANA_RPC_MAINNET in your .env file with a custom RPC endpoint (e.g., Helius, QuickNode, or Alchemy)");
        }
        
        throw error;
      }
    },
  });
}



