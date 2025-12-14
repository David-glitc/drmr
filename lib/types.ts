export type WalletStatus = "disconnected" | "connecting" | "connected";

export interface TokenHolding {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  usd: number;
  change: string;
}

export interface NftHolding {
  name: string;
  floor?: string;
  mint: string;
  image: string;
  description?: string;
  explorerLink?: string;
  collection?: string;
}

export interface ActivityItem {
  title: string;
  timestamp: string;
  status: string;
}

export interface PoolConfig {
  apy: string;
  tvl: string;
  epoch: string;
  description: string;
}

export interface TvlPoint {
  label: string;
  value: number;
}

export interface AllocationSlice {
  label: string;
  percent: number;
}

export interface BurnEvent {
  month: string;
  amount: string;
  hash: string;
}

export interface HeroStat {
  label: string;
  value: string;
  change: string;
}

