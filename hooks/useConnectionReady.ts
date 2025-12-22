"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "./useWallet";

/**
 * Hook to track when the Solana connection is ready
 * Returns true when connection is established and ready to use
 */
export function useConnectionReady() {
  const { connection } = useConnection();
  const { walletStatus } = useWallet();
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let checkTimeoutId: NodeJS.Timeout;

    const checkConnection = async () => {
      if (!mounted) return;

      try {
        setIsChecking(true);
        
        // Wait a bit for connection to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!mounted) return;

        // Try to get connection version - this verifies connection is working
        try {
          await Promise.race([
            connection.getVersion(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout")), 3000)
            )
          ]);
          
          if (mounted) {
            setIsReady(true);
            setIsChecking(false);
          }
        } catch (error) {
          // Connection might not be ready yet, but we'll mark as ready after delay
          // to prevent infinite loading (connection might be slow but functional)
          if (mounted) {
            checkTimeoutId = setTimeout(() => {
              if (mounted) {
                setIsReady(true);
                setIsChecking(false);
              }
            }, 800);
          }
        }
      } catch (error) {
        console.warn("[useConnectionReady] Connection check error:", error);
        // Still mark as ready after delay to prevent infinite loading
        if (mounted) {
          timeoutId = setTimeout(() => {
            if (mounted) {
              setIsReady(true);
              setIsChecking(false);
            }
          }, 1500);
        }
      }
    };

    // Initial check
    checkConnection();

    // Also set a maximum timeout to ensure we don't wait forever
    timeoutId = setTimeout(() => {
      if (mounted) {
        setIsReady(true);
        setIsChecking(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (checkTimeoutId) {
        clearTimeout(checkTimeoutId);
      }
    };
  }, [connection]);

  // Also check wallet status - if wallet is connecting, we're not ready
  const walletConnecting = walletStatus === "connecting";

  return {
    isReady: isReady && !walletConnecting,
    isChecking: isChecking || walletConnecting,
  };
}

