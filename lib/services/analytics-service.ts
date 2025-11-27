import type {
  AllocationSlice,
  HeroStat,
  TvlPoint,
} from "../types";

export interface AnalyticsPayload {
  heroStats: HeroStat[];
  tvlSeries: TvlPoint[];
  allocation: AllocationSlice[];
}

export class AnalyticsService {
  async fetchAnalytics(): Promise<AnalyticsPayload> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    return {
      heroStats: [
        { label: "Total Value Locked", value: "$42.8M", change: "+4.2% WoW" },
        { label: "Rewards Distributed", value: "$1.9M", change: "+12% MoM" },
        { label: "Wallets Connected", value: "1,284", change: "+180 in 24h" },
      ],
      tvlSeries: [
        { label: "Mon", value: 28 },
        { label: "Tue", value: 32 },
        { label: "Wed", value: 31 },
        { label: "Thu", value: 40 },
        { label: "Fri", value: 38 },
        { label: "Sat", value: 42 },
        { label: "Sun", value: 43 },
      ],
      allocation: [
        { label: "SOL Stakers", percent: 54 },
        { label: "DRMR Stakers", percent: 38 },
        { label: "Idle Liquidity", percent: 8 },
      ],
    };
  }
}

