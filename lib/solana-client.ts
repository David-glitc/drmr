"use client";

import { Connection, clusterApiUrl } from "@solana/web3.js";

let cachedConnection: Connection | null = null;

export function getSolanaConnection() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const endpoint =
    process.env.SOLANA_RPC ??
    process.env.NEXT_PUBLIC_SOLANA_RPC ??
    clusterApiUrl("devnet");

  cachedConnection = new Connection(endpoint, "confirmed");
  return cachedConnection;
}

