import { AnalyticsService } from "./analytics-service";
import { BurnService } from "./burn-service";
import { PortfolioService } from "./portfolio-service";
import { StakingService } from "./staking-service";
import { SolanaTokenService } from "./solana-token-service";
import { ValidatorService } from "./validator-service";
import { SolanaStakingService } from "./solana-staking-service";
import { transactionService } from "./transaction-service";

export const portfolioService = new PortfolioService();
export const stakingService = new StakingService();
export const analyticsService = new AnalyticsService();
export const burnService = new BurnService();

// Export types
export type { SPLToken, NFT } from "./solana-token-service";
export type { ValidatorInfo } from "./validator-service";
export { SolanaStakingService } from "./solana-staking-service";
export { transactionService } from "./transaction-service";
export type { Transaction, TransactionHistoryParams, TransactionHistoryResponse, TransactionFilters } from "./transaction-service";

