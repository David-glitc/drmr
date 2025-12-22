"use client";

import { useAtom } from "jotai";
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

import { walletAddressAtom, walletStatusAtom } from "../lib/state";

export function useWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  } = useAdapterWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [walletAddress, setWalletAddress] = useAtom(walletAddressAtom);
  const [walletStatus, setWalletStatus] = useAtom(walletStatusAtom);

  useEffect(() => {
    if (connecting) {
      setWalletStatus("connecting");
      return;
    }

    if (connected && publicKey) {
      setWalletAddress(publicKey.toBase58());
      setWalletStatus("connected");
    } else {
      setWalletAddress(null);
      setWalletStatus("disconnected");
    }
  }, [connected, connecting, publicKey, setWalletAddress, setWalletStatus]);

  const connect = useCallback(() => {
    setWalletStatus("connecting");
    setVisible(true);
  }, [setVisible, setWalletStatus]);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      setWalletAddress(null);
      setWalletStatus("disconnected");
    }
  }, [disconnect, setWalletAddress, setWalletStatus]);

  const sendSol = useCallback(
    async (to: string, amount: number) => {
      if (!publicKey || !sendTransaction) {
        throw new Error("Wallet not connected");
      }

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
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    },
    [publicKey, sendTransaction, connection]
  );

  return useMemo(
    () => ({
      walletAddress,
      walletStatus,
      isConnected: walletStatus === "connected",
      isConnecting: walletStatus === "connecting" || connecting,
      connect,
      disconnect: disconnectWallet,
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
      connecting,
      connect,
      disconnectWallet,
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

