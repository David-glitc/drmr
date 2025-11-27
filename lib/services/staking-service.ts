import type { PoolConfig } from "../types";

export type PoolKey = "SOL" | "DRMR";

const poolConfigs: Record<PoolKey, PoolConfig> = {
  SOL: {
    apy: "7.8%",
    tvl: "$18.2M",
    epoch: "Weekly epochs",
    description:
      "Power the validator set and earn slashing-protected SOL yield.",
  },
  DRMR: {
    apy: "15.4%",
    tvl: "$24.6M",
    epoch: "7-day lock",
    description:
      "Boost DRMR scarcity with dual rewards: SOL yield + burn multipliers.",
  },
};

export class StakingService {
  getPoolConfig(pool: PoolKey): PoolConfig {
    return poolConfigs[pool];
  }

  estimateRewards(pool: PoolKey, amount: number): string {
    const apy = pool === "SOL" ? 0.078 : 0.154;
    const weekly = (amount * (apy / 52)).toFixed(pool === "SOL" ? 2 : 0);
    return pool === "SOL" ? `${weekly} SOL` : `${weekly} DRMR`;
  }
}

