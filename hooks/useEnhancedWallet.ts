"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import {
  useWallet as useAdapterWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  walletAddressAtom,
  walletStatusAtom,
  walletErrorAtom,
  connectionStatusAtom,
  isConnectedAtom,
} from "../lib/state";
import { connectionManager } from "../lib/connection-manager";
import { onChainCache } from "../lib/onchain/cache";

/**
 * Enhanced Wallet Hook
 * 
 * Provides improved wallet connection management with:
 * - Better error handling
 * - Connection health monitoring
 * - Automatic retry logic
 * - Cache invalidation on disconnect
 */
export function useEnhancedWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect: adapterDisconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  } = useAdapterWallet();
  
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  const [walletAddress, setWalletAddress] = useAtom(walletAddressAtom);
  const [walletStatus, setWalletStatus] = useAtom(walletStatusAtom);
  const [walletError, setWalletError] = useAtom(walletErrorAtom);
  const setConnectionStatus = useSetAtom(connectionStatusAtom);
  const isConnected = useAtomValue(isConnectedAtom);

  // Sync wallet adapter state with our state
  useEffect(() => {
    if (connecting) {
      setWalletStatus("connecting");
      setConnectionStatus("connecting");
      setWalletError(null);
      return;
    }

    if (connected && publicKey) {
      const address = publicKey.toBase58();
      setWalletAddress(address);
      setWalletStatus("connected");
      setConnectionStatus("connected");
      setWalletError(null);
      
      // Invalidate cache for old wallet if different
      if (walletAddress && walletAddress !== address) {
        onChainCache.invalidatePattern(`.*:${walletAddress}.*`);
      }
    } else {
      setWalletAddress(null);
      setWalletStatus("disconnected");
      setConnectionStatus("disconnected");
      
      // Clear cache on disconnect
      if (walletAddress) {
        onChainCache.invalidatePattern(`.*:${walletAddress}.*`);
      }
    }
  }, [
    connected,
    connecting,
    publicKey,
    setWalletAddress,
    setWalletStatus,
    setConnectionStatus,
    setWalletError,
    walletAddress,
  ]);

  // Monitor connection health
  useEffect(() => {
    if (!isConnected) return;

    const checkHealth = async () => {
      try {
        const isHealthy = await connectionManager.healthCheck(connection);
        setConnectionStatus(isHealthy ? "connected" : "error");
      } catch (error) {
        setConnectionStatus("error");
        console.error("Connection health check failed:", error);
      }
    };

    const interval = setInterval(checkHealth, 30000); // Check every 30s
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, [isConnected, connection, setConnectionStatus]);

  const connect = useCallback(async () => {
    try {
      setWalletStatus("connecting");
      setConnectionStatus("connecting");
      setWalletError(null);
      setVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect wallet";
      setWalletError(message);
      setWalletStatus("disconnected");
      setConnectionStatus("error");
    }
  }, [setVisible, setWalletStatus, setConnectionStatus, setWalletError]);

  const disconnect = useCallback(async () => {
    try {
      await adapterDisconnect();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect";
      setWalletError(message);
    } finally {
      setWalletAddress(null);
      setWalletStatus("disconnected");
      setConnectionStatus("disconnected");
      
      // Clear wallet-specific cache
      if (walletAddress) {
        onChainCache.invalidatePattern(`.*:${walletAddress}.*`);
      }
    }
  }, [adapterDisconnect, setWalletAddress, setWalletStatus, setConnectionStatus, setWalletError, walletAddress]);

  const sendSol = useCallback(
    async (to: string, amount: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error("Wallet not connected");
      }

      try {
        const toPublicKey = new PublicKey(to);
        const lamports = amount * LAMPORTS_PER_SOL;

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: toPublicKey,
            lamports,
          })
        );

        const signature = await sendTransaction(transaction, connection);
        
        // Invalidate balance cache
        onChainCache.invalidate(`balance:${publicKey.toBase58()}`);
        onChainCache.invalidate(`account:${publicKey.toBase58()}`);
        
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transaction failed";
        setWalletError(message);
        throw error;
      }
    },
    [publicKey, sendTransaction, connection, setWalletError]
  );

  return useMemo(
    () => ({
      walletAddress,
      walletStatus,
      walletError,
      isConnected,
      connect,
      disconnect,
      sendTransaction,
      signTransaction,
      signAllTransactions,
      signMessage,
      sendSol,
      connection,
      publicKey,
      ready: true,
    }),
    [
      walletAddress,
      walletStatus,
      walletError,
      isConnected,
      connect,
      disconnect,
      sendTransaction,
      signTransaction,
      signAllTransactions,
      signMessage,
      sendSol,
      connection,
      publicKey,
    ]
  );
}

