"use client";

import { clusterApiUrl } from "@solana/web3.js";
import { ReactNode, useMemo, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useAtomValue } from "jotai";

import "@solana/wallet-adapter-react-ui/styles.css";
import { networkAtom } from "../lib/state/atoms";
import { connectionManager } from "../lib/connection-manager";

function NetworkSync() {
  const network = useAtomValue(networkAtom);
  const { connection } = useConnection();

  useEffect(() => {
    // Update connection manager when network changes
    connectionManager.setNetwork(network);
  }, [network]);

  return null;
}

function InnerProvider({ children }: { children: ReactNode }) {
  const network = useAtomValue(networkAtom);
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <NetworkSync />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function WalletAdapterProvider({ children }: { children: ReactNode }) {
  return <InnerProvider>{children}</InnerProvider>;
}



