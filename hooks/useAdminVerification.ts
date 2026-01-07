"use client";

import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDrmrStaking } from "./useDrmrStaking";

// Trusted admin wallet address from the contract
const TRUSTED_ADMIN_ADDRESS = "9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8";

export function useAdminVerification() {
  const { publicKey: wallet } = useWallet();
  const { fetchStakingPool } = useDrmrStaking();

  const isAdmin = useMemo(() => {
    if (!wallet) return false;
    
    try {
      const walletAddress = wallet.toBase58();
      const trustedAdmin = new PublicKey(TRUSTED_ADMIN_ADDRESS);
      
      // Check if wallet matches trusted admin
      if (walletAddress === TRUSTED_ADMIN_ADDRESS) {
        return true;
      }

      // Also check if wallet matches the pool admin (in case it was updated)
      // This will be checked asynchronously
      return false;
    } catch {
      return false;
    }
  }, [wallet]);

  // Verify admin status by checking pool admin
  const verifyAdmin = async (): Promise<boolean> => {
    if (!wallet) return false;

    try {
      const pool = await fetchStakingPool();
      if (!pool) return false;

      const walletAddress = wallet.toBase58();
      const poolAdminAddress = pool.admin.toBase58();

      return walletAddress === poolAdminAddress || walletAddress === TRUSTED_ADMIN_ADDRESS;
    } catch {
      return false;
    }
  };

  return {
    isAdmin,
    verifyAdmin,
    trustedAdminAddress: TRUSTED_ADMIN_ADDRESS,
  };
}

