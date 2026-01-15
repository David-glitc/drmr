import type { PoolConfig } from "../types";
import type { ValidatorInfo } from "./validator-service";

export type PoolKey = "SOL" | "DRMR";

const poolConfigs: Record<PoolKey, PoolConfig> = {
  SOL: {
    apy: "7.8%",
    tvl: "1,240,000 SOL",
    epoch: "Weekly epochs",
    description:
      "Power the validator set and earn slashing-protected SOL yield.",
  },
  DRMR: {
    apy: "15.4%",
    tvl: "24,600,000 DRMR",
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
    // For DRMR, we use a more simplified daily/cycle calculation
    const annual = amount * apy;
    const cycle = (annual / (365 * 24 * 12)).toFixed(2); // Assuming 5-min cycles for estimation
    return `${cycle} DRMR`;
  }

  /**
   * Estimate rewards for a specific validator
   */
  estimateValidatorRewards(amount: number, validator: ValidatorInfo, days: number = 7): number {
    // Calculate rewards: amount * (apy / 100) * (days / 365)
    return amount * (validator.apy / 100) * (days / 365);
  }

  /**
   * Format validator APY for display
   */
  formatAPY(apy: number): string {
    return `${apy.toFixed(2)}%`;
  }

  /**
   * Calculate annual return for a stake amount
   */
  calculateAnnualReturn(amount: number, apy: number): number {
    return amount * (apy / 100);
  }
}

