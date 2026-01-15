"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, getMint } from "@solana/spl-token";

export function useDrmrToken(mintAddress: string | null) {
  const { connection } = useConnection();
  const { publicKey: wallet } = useWallet();

  return useQuery({
    queryKey: ["drmr-token", mintAddress, wallet?.toBase58()],
    queryFn: async () => {
      if (!mintAddress || !wallet) return null;

      try {
        const mintPubkey = new PublicKey(mintAddress);
        
        // Get mint info to get actual decimals
        const mintInfo = await getMint(connection, mintPubkey);
        const decimals = mintInfo.decimals;
        
        // Get token account
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet);
        const account = await getAccount(connection, tokenAccount);
        
        // Calculate balance using actual decimals
        const balance = Number(account.amount) / Math.pow(10, decimals);
        
        return {
          balance,
          decimals: decimals,
          address: tokenAccount.toBase58(),
        };
      } catch (err) {
        // Token account might not exist
        return {
          balance: 0,
          decimals: null,
          address: null,
        };
      }
    },
    enabled: !!mintAddress && !!wallet,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}