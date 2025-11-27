"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";

import { stakingService } from "../lib/services";
import {
  activePoolAtom,
  estimatedRewardsAtom,
  poolConfigAtom,
} from "../lib/state";
import type { PoolKey } from "../lib/services/staking-service";

export function useStaking() {
  const [activePool, setActivePool] = useAtom(activePoolAtom);
  const [poolConfig, setPoolConfig] = useAtom(poolConfigAtom);
  const [estimatedRewards, setEstimatedRewards] = useAtom(estimatedRewardsAtom);

  const switchPool = useCallback(
    (pool: PoolKey) => {
      setActivePool(pool);
      setPoolConfig(stakingService.getPoolConfig(pool));
      setEstimatedRewards(stakingService.estimateRewards(pool, 0));
    },
    [setActivePool, setPoolConfig, setEstimatedRewards]
  );

  const estimateRewards = useCallback(
    (pool: PoolKey, amount: number) => {
      const estimate = stakingService.estimateRewards(pool, amount);
      setEstimatedRewards(estimate);
      return estimate;
    },
    [setEstimatedRewards]
  );

  return {
    activePool,
    poolConfig,
    estimatedRewards,
    switchPool,
    estimateRewards,
  };
}

