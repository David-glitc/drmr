"use client";

import { useEffect, useState, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

/**
 * Hook to track when the Solana RPC connection is ready
 * This only checks the initial RPC connection, NOT wallet connection status
 * Wallet connection/disconnection should not block the UI
 */
export function useConnectionReady() {
  const { connection } = useConnection();
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false); // Only check once on initial load

  useEffect(() => {
    // Only check connection once on initial load
    if (hasCheckedRef.current) {
      return;
    }

    let mounted = true;
    let maxTimeoutId: NodeJS.Timeout | undefined;
    let connectionCheckId: NodeJS.Timeout | undefined;
    let isResolved = false;

    // Set a maximum timeout to ensure we never wait forever
    maxTimeoutId = setTimeout(() => {
      if (mounted && !isResolved) {
        isResolved = true;
        hasCheckedRef.current = true;
        console.warn("[useConnectionReady] Max timeout (2s) reached, marking as ready");
        setIsReady(true);
        setIsChecking(false);
      }
    }, 2000);

    const checkConnection = async () => {
      if (!mounted || isResolved) return;

      try {
        setIsChecking(true);
        
        connectionCheckId = setTimeout(() => {
          if (mounted && !isResolved) {
            isResolved = true;
            hasCheckedRef.current = true;
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
          
          if (connectionCheckId) {
            clearTimeout(connectionCheckId);
            connectionCheckId = undefined;
          }
          
          if (mounted && !isResolved) {
            isResolved = true;
            hasCheckedRef.current = true;
            setIsReady(true);
            setIsChecking(false);
          }
        } catch (error) {
          if (connectionCheckId) {
            clearTimeout(connectionCheckId);
            connectionCheckId = undefined;
          }
          console.warn("[useConnectionReady] Connection check failed, marking as ready:", error);
          if (mounted && !isResolved) {
            isResolved = true;
            hasCheckedRef.current = true;
            setIsReady(true);
            setIsChecking(false);
          }
        }
      } catch (error) {
        if (connectionCheckId) {
          clearTimeout(connectionCheckId);
          connectionCheckId = undefined;
        }
        console.warn("[useConnectionReady] Connection check error, marking as ready:", error);
        if (mounted && !isResolved) {
          isResolved = true;
          hasCheckedRef.current = true;
          setIsReady(true);
          setIsChecking(false);
        }
      }
    };

    checkConnection();

    return () => {
      mounted = false;
      isResolved = true;
      if (maxTimeoutId) clearTimeout(maxTimeoutId);
      if (connectionCheckId) clearTimeout(connectionCheckId);
    };
  }, [connection]);

  return {
    isReady,
    isChecking,
  };
}

