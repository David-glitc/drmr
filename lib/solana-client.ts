"use client";

import { clusterApiUrl } from "@solana/web3.js";
import { connectionManager } from "./connection-manager";

/**
 * Legacy function - now uses ConnectionManager
 * @deprecated Use connectionManager.getConnection() directly
 */
export function getSolanaConnection() {
  return connectionManager.getDefaultConnection();
}

/**
 * Get Solana RPC endpoint
 * Note: This is now reactive via the networkAtom in the provider
 */
export function getSolanaEndpoint(network: "mainnet-beta" | "devnet" | "testnet" = "devnet") {
  if (network === "mainnet-beta") {
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC ??
      process.env.SOLANA_RPC ??
      clusterApiUrl("mainnet-beta")
    );
  } else if (network === "devnet") {
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
      process.env.NEXT_PUBLIC_SOLANA_RPC ??
      process.env.SOLANA_RPC ??
      clusterApiUrl("devnet")
    );
  } else {
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC ??
      process.env.SOLANA_RPC ??
      clusterApiUrl("testnet")
    );
  }
}

