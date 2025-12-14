import { atom } from "jotai";

import type { WalletStatus } from "./types";
import type { PoolKey } from "./services/staking-service";
import type { PoolConfig } from "./types";
import { stakingService } from "./services";

const initialPool = stakingService.getPoolConfig("SOL");
const initialRewards = stakingService.estimateRewards("SOL", 0);

// Legacy atoms - kept for backward compatibility
// New code should use lib/state/atoms.ts
export const walletAddressAtom = atom<string | null>(null);
export const walletStatusAtom = atom<WalletStatus>("disconnected");

export const activePoolAtom = atom<PoolKey>("SOL");
export const poolConfigAtom = atom<PoolConfig>(initialPool);
export const estimatedRewardsAtom = atom<string>(initialRewards);

