import { atom } from "jotai";

import type { WalletStatus } from "./types";
import type { PoolKey } from "./services/staking-service";
import type { PoolConfig } from "./types";
import { stakingService } from "./services";

const initialPool = stakingService.getPoolConfig("SOL");
const initialRewards = stakingService.estimateRewards("SOL", 0);

// Legacy atoms - kept for backward compatibility
export const activePoolAtom = atom<PoolKey>("SOL");
export const poolConfigAtom = atom<PoolConfig>(initialPool);
export const estimatedRewardsAtom = atom<string>(initialRewards);

// Re-export all atoms from the new state management system
export {
  walletAddressAtom,
  walletStatusAtom,
  walletErrorAtom,
  connectionStatusAtom,
  lastConnectionAttemptAtom,
  connectionRetryCountAtom,
  accountDataAtom,
  portfolioDataAtom,
  cacheTimestampAtom,
  cacheDataAtom,
  isLoadingAtom,
  errorMessageAtom,
  autoRefreshAtom,
  refreshIntervalAtom,
  networkAtom,
  isConnectedAtom,
  hasWalletAtom,
  shouldRefreshAtom,
} from "./state/index";

