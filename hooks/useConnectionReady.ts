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
    let maxTimeoutId: NodeJS.Timeout | undefined;
    let connectionCheckId: NodeJS.Timeout | undefined;
    let isResolved = false; // Prevent multiple state updates

    // Set a maximum timeout FIRST to ensure we never wait forever
    maxTimeoutId = setTimeout(() => {
      if (mounted && !isResolved) {
        isResolved = true;
        console.warn("[useConnectionReady] Max timeout (2s) reached, marking as ready");
        setIsReady(true);
        setIsChecking(false);
      }
    }, 2000);

    const checkConnection = async () => {
      if (!mounted || isResolved) return;

      try {
        setIsChecking(true);
        
        // Try to get connection version with a very short timeout
        // If this fails, we'll just mark as ready anyway
        connectionCheckId = setTimeout(() => {
          if (mounted && !isResolved) {
            isResolved = true;
            console.warn("[useConnectionReady] Connection check timeout, marking as ready");
            setIsReady(true);
            setIsChecking(false);
          }
        }, 1500);

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
            connectionCheckId = undefined;
          }
          
          if (mounted && !isResolved) {
            isResolved = true;
            setIsReady(true);
            setIsChecking(false);
          }
        } catch (error) {
          // Clear the timeout
          if (connectionCheckId) {
            clearTimeout(connectionCheckId);
            connectionCheckId = undefined;
          }
          console.warn("[useConnectionReady] Connection check failed, marking as ready:", error);
          // Mark as ready immediately if connection check fails
          if (mounted && !isResolved) {
            isResolved = true;
            setIsReady(true);
            setIsChecking(false);
          }
        }
      } catch (error) {
        // Clear the timeout
        if (connectionCheckId) {
          clearTimeout(connectionCheckId);
          connectionCheckId = undefined;
        }
        console.warn("[useConnectionReady] Connection check error, marking as ready:", error);
        // Mark as ready immediately on error
        if (mounted && !isResolved) {
          isResolved = true;
          setIsReady(true);
          setIsChecking(false);
        }
      }
    };

    // Start check immediately
    checkConnection();

    return () => {
      mounted = false;
      isResolved = true; // Prevent any pending timeouts from updating state
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

