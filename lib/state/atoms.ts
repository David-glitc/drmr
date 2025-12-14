import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import type { WalletStatus } from "../types";

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
 * Settings Atoms (with persistence)
 */
export const autoRefreshAtom = atomWithStorage<boolean>("drmr-auto-refresh", true);
export const refreshIntervalAtom = atomWithStorage<number>("drmr-refresh-interval", 30000);
export const networkAtom = atomWithStorage<"mainnet-beta" | "devnet" | "testnet">(
  "drmr-network",
  "devnet"
);

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

