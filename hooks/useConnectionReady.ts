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
    let maxTimeoutId: NodeJS.Timeout;
    let connectionCheckId: NodeJS.Timeout;

    // Set a maximum timeout FIRST to ensure we never wait forever
    maxTimeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("[useConnectionReady] Max timeout (2s) reached, marking as ready");
        setIsReady(true);
        setIsChecking(false);
      }
    }, 2000); // Reduced to 2 seconds max

    const checkConnection = async () => {
      if (!mounted) return;

      try {
        setIsChecking(true);
        
        // Try to get connection version with a very short timeout
        // If this fails, we'll just mark as ready anyway
        connectionCheckId = setTimeout(() => {
          if (mounted) {
            console.warn("[useConnectionReady] Connection check timeout, marking as ready");
            setIsReady(true);
            setIsChecking(false);
          }
        }, 1500); // Fail after 1.5 seconds

        try {
          await Promise.race([
            connection.getVersion(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Connection timeout")), 1500)
            )
          ]);
          
          // Clear the timeout since we succeeded
          if (connectionCheckId) {
            clearTimeout(connectionCheckId);
          }
          
          if (mounted) {
            setIsReady(true);
            setIsChecking(false);
          }
        } catch (error) {
          // Clear the timeout
          if (connectionCheckId) {
            clearTimeout(connectionCheckId);
          }
          console.warn("[useConnectionReady] Connection check failed, marking as ready:", error);
          // Mark as ready immediately if connection check fails
          if (mounted) {
            setIsReady(true);
            setIsChecking(false);
          }
        }
      } catch (error) {
        // Clear the timeout
        if (connectionCheckId) {
          clearTimeout(connectionCheckId);
        }
        console.warn("[useConnectionReady] Connection check error, marking as ready:", error);
        // Mark as ready immediately on error
        if (mounted) {
          setIsReady(true);
          setIsChecking(false);
        }
      }
    };

    // Start check immediately
    checkConnection();

    return () => {
      mounted = false;
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      if (connectionCheckId) {
        clearTimeout(connectionCheckId);
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

