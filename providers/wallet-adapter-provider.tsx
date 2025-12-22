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
import { useAtomValue, useAtom } from "jotai";

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

function NetworkInitializer() {
  const [network, setNetwork] = useAtom(networkAtom);

  useEffect(() => {
    // Initialize network from NEXT_PUBLIC_MODE if set
    const envMode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
    if (envMode) {
      let targetNetwork: "mainnet-beta" | "devnet" | "testnet" = "devnet";
      
      if (envMode === "mainnet" || envMode === "mainnet-beta") {
        targetNetwork = "mainnet-beta";
      } else if (envMode === "testnet") {
        targetNetwork = "testnet";
      } else {
        targetNetwork = "devnet";
      }

      // Only update if different from current network
      if (network !== targetNetwork) {
        console.log(`[NetworkInitializer] Setting network from NEXT_PUBLIC_MODE=${envMode} to ${targetNetwork}`);
        setNetwork(targetNetwork);
      }
    } else {
      // If no env mode is set, ensure we're on devnet (default)
      if (network !== "devnet") {
        console.log("[NetworkInitializer] No NEXT_PUBLIC_MODE set, defaulting to devnet");
        setNetwork("devnet");
      }
    }
  }, []); // Only run on mount

  return null;
}

function InnerProvider({ children }: { children: ReactNode }) {
  const network = useAtomValue(networkAtom);
  
  // Get custom RPC endpoint from env or fallback to public endpoint
  const endpoint = useMemo(() => {
    // Check for network-specific RPC endpoints first
    let customRpc: string | undefined;
    
    if (network === "mainnet-beta") {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
    } else if (network === "devnet") {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
    } else {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
    }
    
    // If custom RPC is set, use it
    if (customRpc) {
      console.log(`[WalletAdapterProvider] Using custom RPC endpoint for ${network}:`, customRpc);
      return customRpc;
    }
    
    // Fallback to public cluster API URL based on network
    const publicEndpoint = clusterApiUrl(network);
    console.log("[WalletAdapterProvider] Using public RPC endpoint:", publicEndpoint, "for network:", network);
    console.warn(`[WalletAdapterProvider] WARNING: Public RPC endpoints have rate limits. Consider setting NEXT_PUBLIC_SOLANA_RPC_${network.toUpperCase()} in your .env file`);
    return publicEndpoint;
  }, [network]);
  
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
          <NetworkInitializer />
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



