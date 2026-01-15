import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import type { WalletStatus, PoolConfig } from "../types";
import type { PoolKey } from "../services/staking-service";
import { stakingService } from "../services";

/**
 * Core Wallet State Atoms
 */
export const walletAddressAtom = atom<string | null>(null);
export const walletStatusAtom = atom<WalletStatus>("disconnected");
export const walletErrorAtom = atom<string | null>(null);

/**
 * Connection State Atoms
 */
export const connectionStatusAtom = atom<"connected" | "disconnected" | "connecting" | "error">("disconnected");
export const lastConnectionAttemptAtom = atom<number | null>(null);
export const connectionRetryCountAtom = atom<number>(0);

/**
 * On-Chain Data State Atoms
 */
export const accountDataAtom = atom<{
  balance: number;
  slot: number;
  rentEpoch: number | null;
  lastUpdated: number;
} | null>(null);

export const portfolioDataAtom = atom<{
  tokens: any[];
  nfts: any[];
  activity: any[];
  lastUpdated: number;
} | null>(null);

/**
 * Cache State Atoms (with persistence)
 */
export const cacheTimestampAtom = atomWithStorage<Record<string, number>>(
  "drmr-cache-timestamps",
  {}
);

export const cacheDataAtom = atomWithStorage<Record<string, any>>(
  "drmr-cache-data",
  {}
);

/**
 * UI State Atoms
 */
export const isLoadingAtom = atom<boolean>(false);
export const errorMessageAtom = atom<string | null>(null);

/**
 * Get initial network from environment variable or default to devnet
 */
function getInitialNetwork(): "mainnet-beta" | "devnet" | "testnet" {
  if (typeof window === "undefined") {
    // Server-side: use env variable
    const mode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
    if (mode === "mainnet" || mode === "mainnet-beta") {
      return "mainnet-beta";
    }
    if (mode === "testnet") {
      return "testnet";
    }
    return "devnet"; // Default
  }

  // Client-side: check localStorage first, then env variable
  const stored = localStorage.getItem("drmr-network");
  if (stored === "mainnet-beta" || stored === "devnet" || stored === "testnet") {
    return stored;
  }

  // If not in localStorage, use env variable
  const mode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
  if (mode === "mainnet" || mode === "mainnet-beta") {
    return "mainnet-beta";
  }
  if (mode === "testnet") {
    return "testnet";
  }
  return "devnet"; // Default
}

/**
 * Settings Atoms (with persistence)
 */
export const autoRefreshAtom = atomWithStorage<boolean>("drmr-auto-refresh", true);
export const refreshIntervalAtom = atomWithStorage<number>("drmr-refresh-interval", 300000);
export const networkAtom = atomWithStorage<"mainnet-beta" | "devnet" | "testnet">(
  "drmr-network",
  getInitialNetwork()
);
export const explorerAtom = atomWithStorage<"solana" | "solscan" | "solanafm">("drmr-explorer", "solana");

/**
 * Derived Atoms
 */
export const isConnectedAtom = atom(
  (get) => get(walletStatusAtom) === "connected"
);

export const hasWalletAtom = atom(
  (get) => get(walletAddressAtom) !== null
);

export const shouldRefreshAtom = atom(
  (get) => {
    const autoRefresh = get(autoRefreshAtom);
    const refreshInterval = get(refreshIntervalAtom);
    const cacheTimestamps = get(cacheTimestampAtom);
    const now = Date.now();

    if (!autoRefresh) return false;

    // Check if any cache is stale
    return Object.values(cacheTimestamps).some(
      (timestamp) => now - timestamp > refreshInterval
    );
  }
);


/**
 * Staking State Atoms
 */
export const activePoolAtom = atom<PoolKey>("DRMR");
export const poolConfigAtom = atom<PoolConfig>(stakingService.getPoolConfig("DRMR"));
export const estimatedRewardsAtom = atom<string>(stakingService.estimateRewards("DRMR", 0));
