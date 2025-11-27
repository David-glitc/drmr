"use client";

import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import { useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { walletAddressAtom, walletStatusAtom } from "../lib/state";

export function useWallet() {
  const { publicKey, connected, connecting, disconnect } = useAdapterWallet();
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

  return useMemo(
    () => ({
      walletAddress,
      walletStatus,
      isConnected: walletStatus === "connected",
      connect,
      disconnect: disconnectWallet,
      ready: true,
    }),
    [walletAddress, walletStatus, connect, disconnectWallet]
  );
}

