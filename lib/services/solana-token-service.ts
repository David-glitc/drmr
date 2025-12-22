"use client";

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connectionManager } from "../connection-manager";

/**
 * SPL Token Interface
 */
export interface SPLToken {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number; // Human-readable amount
  name?: string;
  symbol?: string;
}

/**
 * NFT Interface with full metadata
 */
export interface NFT {
  mint: string;
  name: string;
  description: string;
  image: string; // URL to the NFT image
  explorerLink: string; // Link to Solana explorer for the NFT
  collection?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * SolanaTokenService
 * 
 * Enhanced service for fetching SPL tokens and NFTs using Metaplex
 */
export class SolanaTokenService {
  private connection: Connection;

  constructor(connection?: Connection) {
    this.connection = connection ?? connectionManager.getDefaultConnection();
  }

  /**
   * Fetch SPL token balances for a given address
   */
  async getSPLTokens(address: string): Promise<SPLToken[]> {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program
      });

      const splTokens: SPLToken[] = tokenAccounts.value
        .filter((account) => {
          const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
          return amount > 0;
        })
        .map((account) => {
          const info = account.account.data.parsed.info;
          return {
            mint: info.mint,
            amount: parseInt(info.tokenAmount.amount, 10),
            decimals: info.tokenAmount.decimals,
            uiAmount: info.tokenAmount.uiAmount,
          };
        });

      return splTokens;
    } catch (error) {
      console.error("Error fetching SPL tokens:", error);
      throw error;
    }
  }

  /**
   * Fetch NFTs via API route (server-side)
   * This avoids bundling Metaplex and Node.js dependencies in the client
   */
  async getNFTs(address: string, network: "mainnet-beta" | "devnet" | "testnet" = "devnet"): Promise<NFT[]> {
    try {
      console.log(`[SolanaTokenService] Fetching NFTs for ${address} on ${network}`);
      const response = await fetch(`/api/nfts?address=${encodeURIComponent(address)}&network=${network}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          console.warn("[SolanaTokenService] Rate limit hit when fetching NFTs. Returning empty array.");
          return []; // Return empty array instead of throwing on rate limit
        }
        throw new Error(`Failed to fetch NFTs: ${response.statusText} - ${errorData.details || ""}`);
      }

      const data = await response.json();
      console.log(`[SolanaTokenService] Fetched ${data.nfts?.length || 0} NFTs (${data.fetched || 0}/${data.total || 0})`);
      if (data.rateLimited) {
        console.warn("[SolanaTokenService] Rate limit encountered during NFT fetch");
      }
      return data.nfts || [];
    } catch (error) {
      console.error("[SolanaTokenService] Error fetching NFTs:", error);
      // Don't throw on rate limit errors, just return empty array
      if (error instanceof Error && error.message.includes("429")) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get SOL balance for an address
   */
  async getSOLBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const lamports = await this.connection.getBalance(publicKey);
      return lamports / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error("Error fetching SOL balance:", error);
      throw error;
    }
  }
}

