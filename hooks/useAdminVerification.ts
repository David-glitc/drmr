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

  // Verify admin status by checking pool admins
  const verifyAdmin = async (): Promise<boolean> => {
    if (!wallet) return false;

    const walletAddress = wallet.toBase58();
    
    // First check: If wallet matches trusted admin, always allow
    if (walletAddress === TRUSTED_ADMIN_ADDRESS) {
      return true;
    }

    // Second check: Verify against pool admins array (if pool exists)
    try {
      const pool = await fetchStakingPool();
      if (!pool) {
        // Pool doesn't exist yet, but if wallet is trusted admin, allow access
        return walletAddress === TRUSTED_ADMIN_ADDRESS;
      }

      // Check if wallet is in the admins array
      const isPoolAdmin = pool.admins.some(admin => admin.toBase58() === walletAddress);
      return isPoolAdmin;
    } catch {
      // On error, still check if it's trusted admin
      return walletAddress === TRUSTED_ADMIN_ADDRESS;
    }
  };

  return {
    isAdmin,
    verifyAdmin,
    trustedAdminAddress: TRUSTED_ADMIN_ADDRESS,
  };
}

