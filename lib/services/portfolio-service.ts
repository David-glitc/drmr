"use client";

import { PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import type {
  ActivityItem,
  NftHolding,
  TokenHolding,
} from "../types";
import { SolanaTokenService } from "./solana-token-service";

export interface PortfolioSnapshot {
  tokens: TokenHolding[];
  nfts: NftHolding[];
  activity: ActivityItem[];
}

// Common token mints for metadata
const TOKEN_METADATA: Record<string, { name: string; symbol: string; decimals: number }> = {
  So11111111111111111111111111111111111111112: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
  },
};

export class PortfolioService {
  async fetchPortfolio(
    walletAddress?: string | null,
    connection?: Connection,
    solPrice?: number,
    network: "mainnet-beta" | "devnet" | "testnet" = "devnet"
  ): Promise<PortfolioSnapshot> {
    console.log("[PortfolioService] fetchPortfolio called with:", {
      walletAddress,
      hasConnection: !!connection,
      solPrice,
      network,
    });

    if (!walletAddress || !connection) {
      console.warn("[PortfolioService] Missing walletAddress or connection, returning empty portfolio");
      return {
        tokens: [],
        nfts: [],
        activity: [],
      };
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      console.log("[PortfolioService] PublicKey created:", publicKey.toBase58());

      // Fetch SOL balance
      console.log("[PortfolioService] Fetching SOL balance...");
      const solBalanceLamports = await connection.getBalance(publicKey);
      const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;
      console.log("[PortfolioService] SOL balance retrieved:", {
        lamports: solBalanceLamports,
        sol: solBalance,
        usd: solPrice ? solBalance * solPrice : 0,
      });

      // Fetch SPL token accounts
      console.log("[PortfolioService] Fetching SPL token accounts...");
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      console.log("[PortfolioService] Found", tokenAccounts.value.length, "token accounts");

      const tokens: TokenHolding[] = [];

      // Add SOL if balance > 0
      if (solBalance > 0) {
        tokens.push({
          id: "sol",
          name: "Solana",
          symbol: "SOL",
          amount: solBalance,
          usd: solPrice ? solBalance * solPrice : 0,
          change: "+0%",
        });
      }

      // Process SPL tokens
      for (const accountInfo of tokenAccounts.value) {
        const parsedInfo = accountInfo.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const tokenAmount = parsedInfo.tokenAmount;

        if (tokenAmount.uiAmount === 0 || tokenAmount.uiAmount === null) {
          continue;
        }

        // Get token metadata
        const metadata =
          TOKEN_METADATA[mint] ||
          (await this.fetchTokenMetadata(connection, mint)) || {
            name: "Unknown Token",
            symbol: mint.slice(0, 4).toUpperCase(),
            decimals: tokenAmount.decimals,
          };

        tokens.push({
          id: mint,
          name: metadata.name,
          symbol: metadata.symbol,
          amount: tokenAmount.uiAmount,
          usd: 0, // You can fetch real USD price from an API
          change: "+0%",
        });
      }

      // Fetch NFTs using Metaplex
      console.log("[PortfolioService] Fetching NFTs...");
      const tokenService = new SolanaTokenService(connection);
      let nfts: NftHolding[] = [];
      
      try {
        // Use the provided network parameter (defaults to devnet)
        console.log(`[PortfolioService] Fetching NFTs on network: ${network}`);
        const metaplexNFTs = await tokenService.getNFTs(walletAddress, network);
        nfts = metaplexNFTs.map((nft) => ({
          name: nft.name,
          mint: nft.mint,
          image: nft.image,
          description: nft.description,
          explorerLink: nft.explorerLink,
          collection: nft.collection,
        }));
        console.log("[PortfolioService] Found", nfts.length, "NFTs");
      } catch (error: any) {
        console.error("[PortfolioService] Error fetching NFTs:", error);
        // Continue without NFTs if fetch fails (including rate limits)
        if (error?.message?.includes("429") || error?.code === 429) {
          console.warn("[PortfolioService] Rate limit hit when fetching NFTs. Continuing without NFTs.");
        }
      }

      // Fetch recent transactions
      console.log("[PortfolioService] Fetching recent transactions...");
      const activity = await this.fetchRecentTransactions(connection, publicKey);
      console.log("[PortfolioService] Found", activity.length, "activities");

      const result = {
        tokens: tokens.sort((a, b) => b.amount - a.amount),
        nfts,
        activity,
      };

      console.log("[PortfolioService] Portfolio fetch complete:", {
        tokenCount: result.tokens.length,
        nftCount: result.nfts.length,
        activityCount: result.activity.length,
        totalTokens: result.tokens.map(t => ({ symbol: t.symbol, amount: t.amount, usd: t.usd })),
      });

      return result;
    } catch (error: any) {
      console.error("[PortfolioService] Error fetching portfolio:", error);
      console.error("[PortfolioService] Error details:", {
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
      
      // Provide helpful error message for 403 errors
      if (error?.message?.includes("403") || error?.code === 403) {
        console.error("[PortfolioService] 403 Forbidden Error - The RPC endpoint is blocking requests.");
        console.error("[PortfolioService] Solution: Set NEXT_PUBLIC_SOLANA_RPC_DEVNET or NEXT_PUBLIC_SOLANA_RPC_MAINNET in your .env file with a custom RPC endpoint");
      }
      
      return {
        tokens: [],
        nfts: [],
        activity: [],
      };
    }
  }

  private async fetchTokenMetadata(
    connection: Connection,
    mint: string
  ): Promise<{ name: string; symbol: string; decimals: number } | null> {
    try {
      // Try to fetch from on-chain metadata
      // This is a simplified version - you might want to use a token registry API
      const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mint));
      const parsed = mintInfo.value?.data;
      
      if (parsed && "parsed" in parsed) {
        return {
          name: "Token",
          symbol: mint.slice(0, 4).toUpperCase(),
          decimals: parsed.parsed.info.decimals || 9,
        };
      }
    } catch (error) {
      console.error("Error fetching token metadata:", error);
    }
    return null;
  }

  private async fetchRecentTransactions(
    connection: Connection,
    publicKey: PublicKey
  ): Promise<ActivityItem[]> {
    try {
      // Fetch recent signatures (last 10 transactions)
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 10,
      });

      const activities: ActivityItem[] = [];

      for (const sigInfo of signatures) {
        try {
          const tx = await connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) continue;

          const timestamp = sigInfo.blockTime
            ? new Date(sigInfo.blockTime * 1000)
            : new Date();
          const timeAgo = this.getTimeAgo(timestamp);

          // Determine transaction type
          let title = "Transaction";
          let status = "Confirmed";

          if (tx.meta?.err) {
            status = "Failed";
          }

          // Check if it's a transfer
          const preBalances = tx.meta?.preBalances || [];
          const postBalances = tx.meta?.postBalances || [];
          const accountKeys = tx.transaction.message.accountKeys.map((k) =>
            k.pubkey.toBase58()
          );
          const accountIndex = accountKeys.findIndex(
            (k) => k === publicKey.toBase58()
          );

          if (accountIndex >= 0) {
            const balanceChange =
              (postBalances[accountIndex] - preBalances[accountIndex]) /
              LAMPORTS_PER_SOL;

            if (balanceChange > 0) {
              title = `Received ${balanceChange.toFixed(4)} SOL`;
            } else if (balanceChange < 0) {
              title = `Sent ${Math.abs(balanceChange).toFixed(4)} SOL`;
            }
          }

          activities.push({
            title,
            timestamp: timeAgo,
            status,
          });
        } catch (error) {
          console.error("Error parsing transaction:", error);
        }
      }

      return activities;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  }
}

