import type {
  ActivityItem,
  NftHolding,
  TokenHolding,
} from "../types";

export interface PortfolioSnapshot {
  tokens: TokenHolding[];
  nfts: NftHolding[];
  activity: ActivityItem[];
}

export class PortfolioService {
  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      tokens: [
        {
          id: "sol",
          name: "Solana",
          symbol: "SOL",
          amount: 128.4,
          usd: 18852,
          change: "+3.1%",
        },
        {
          id: "drmr",
          name: "DRMR",
          symbol: "DRMR",
          amount: 482_000,
          usd: 32640,
          change: "+8.4%",
        },
        {
          id: "usdc",
          name: "USD Coin",
          symbol: "USDC",
          amount: 6_400,
          usd: 6400,
          change: "+0.1%",
        },
      ],
      nfts: [
        { name: "DRMR Genesis #18", floor: "42 SOL" },
        { name: "Helius Access #04", floor: "18 SOL" },
        { name: "Validator Pass #772", floor: "9 SOL" },
      ],
      activity: [
        { title: "Staked 500 DRMR", timestamp: "2m ago", status: "Pending" },
        { title: "Claimed 2.4 SOL", timestamp: "3h ago", status: "Confirmed" },
        { title: "Burn event executed", timestamp: "1d ago", status: "Admin" },
      ],
    };
  }
}

