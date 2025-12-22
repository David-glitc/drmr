import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import type { Network } from "../connection-manager";

export interface ValidatorInfo {
  voteAccount: string;
  identity: string;
  name: string;
  apy: number;
  commission: number;
  activatedStake: number;
  epochCredits: number;
  lastVote: number;
  rootSlot: number;
  delinquent: boolean;
}

export class ValidatorService {
  private connection: Connection;
  private network: Network;

  constructor(connection: Connection, network: Network = "devnet") {
    this.connection = connection;
    this.network = network;
  }

  /**
   * Fetch all validators from the Solana network
   */
  async fetchValidators(): Promise<ValidatorInfo[]> {
    try {
      console.log(`[ValidatorService] Fetching validators for ${this.network}...`);
      
      // Get vote accounts
      const voteAccounts = await this.connection.getVoteAccounts();
      
      // Use current validators (non-delinquent) for devnet
      const validators = this.network === "devnet" 
        ? voteAccounts.current 
        : voteAccounts.current.concat(voteAccounts.delinquent);

      console.log(`[ValidatorService] Found ${validators.length} validators`);

      // Get current epoch info for APY calculation
      const epochInfo = await this.connection.getEpochInfo();
      const epochSchedule = await this.connection.getEpochSchedule();
      
      // Calculate APY based on epoch credits and stake
      const validatorsWithAPY = await Promise.all(
        validators.map(async (validator) => {
          try {
            // Fetch validator identity account for name
            let name = validator.votePubkey.slice(0, 8);
            try {
              const identityAccount = await this.connection.getAccountInfo(
                new PublicKey(validator.nodePubkey)
              );
              // Try to extract name from account data if available
              if (identityAccount?.data) {
                // Most validators don't store name in identity account, so we'll use a default
                name = `Validator ${validator.votePubkey.slice(0, 8)}`;
              }
            } catch (error) {
              // If we can't fetch identity, use vote pubkey
              console.warn(`[ValidatorService] Could not fetch identity for ${validator.votePubkey}`);
            }

            // Calculate APY based on validator performance
            // For devnet, validators typically have higher APY due to test environment
            // Base APY calculation: consider commission and network
            const baseAPY = this.network === "devnet" ? 0.08 : 0.07; // ~8% for devnet, ~7% for mainnet
            const commissionRate = validator.commission / 100;
            
            // epochCredits is an array of [epoch, credits, previousCredits] tuples
            // Get the total credits from the last entry if available
            const epochCreditsArray = validator.epochCredits || [];
            const hasEpochCredits = Array.isArray(epochCreditsArray) && epochCreditsArray.length > 0;
            const totalEpochCredits = hasEpochCredits 
              ? (epochCreditsArray[epochCreditsArray.length - 1] as [number, number, number])[1] 
              : 0;
            
            // APY after commission: baseAPY * (1 - commissionRate)
            // Add some variance based on epoch credits performance
            const performanceMultiplier = totalEpochCredits > 0 ? 1.0 : 0.8;
            const apy = baseAPY * (1 - commissionRate) * performanceMultiplier * 100; // Convert to percentage

            return {
              voteAccount: validator.votePubkey,
              identity: validator.nodePubkey,
              name: name,
              apy: Math.max(0, apy), // Ensure non-negative
              commission: validator.commission,
              activatedStake: validator.activatedStake,
              epochCredits: totalEpochCredits, // Store total credits as number
              lastVote: (validator as any).lastVote ?? 0, // lastVote may not exist in type definition
              rootSlot: (validator as any).rootSlot ?? 0, // rootSlot exists in RPC response but not in type definition
              delinquent: false,
            };
          } catch (error) {
            console.error(`[ValidatorService] Error processing validator ${validator.votePubkey}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls and sort by APY (descending)
      const validValidators = validatorsWithAPY
        .filter((v): v is ValidatorInfo => v !== null)
        .sort((a, b) => b.apy - a.apy);

      console.log(`[ValidatorService] Processed ${validValidators.length} validators`);
      return validValidators;
    } catch (error) {
      console.error("[ValidatorService] Error fetching validators:", error);
      throw error;
    }
  }

  /**
   * Get validator by vote account address
   */
  async getValidator(voteAccount: string): Promise<ValidatorInfo | null> {
    const validators = await this.fetchValidators();
    return validators.find((v) => v.voteAccount === voteAccount) || null;
  }

  /**
   * Calculate estimated rewards for staking with a validator
   */
  calculateRewards(amount: number, apy: number, days: number = 7): number {
    // Simple interest calculation: amount * (apy / 100) * (days / 365)
    return amount * (apy / 100) * (days / 365);
  }

  /**
   * Get top validators by APY
   */
  async getTopValidators(limit: number = 10): Promise<ValidatorInfo[]> {
    const validators = await this.fetchValidators();
    return validators.slice(0, limit);
  }
}

