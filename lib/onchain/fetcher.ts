/**
 * On-Chain Data Fetcher
 * 
 * Provides optimized data fetching with:
 * - Automatic retry logic
 * - Request batching
 * - Error handling
 * - Rate limiting
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { onChainCache } from "./cache";

interface FetchOptions {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  retryDelay?: number;
}

interface BatchRequest<T> {
  key: string;
  fetcher: () => Promise<T>;
  options?: FetchOptions;
}

class OnChainFetcher {
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;
  private requestQueue: Map<string, Promise<any>> = new Map();

  /**
   * Fetch with automatic retry and caching
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = 30000,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
    } = options;

    // Check cache first
    if (cache) {
      const cached = onChainCache.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if request is already in progress
    const existingRequest = this.requestQueue.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Create new request with retry logic
    const request = this.fetchWithRetry(fetcher, retries, retryDelay);

    this.requestQueue.set(key, request);

    try {
      const result = await request;
      
      // Cache the result
      if (cache) {
        onChainCache.set(key, result, cacheTTL);
      }

      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry<T>(
    fetcher: () => Promise<T>,
    retries: number,
    delay: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.sleep(delay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("Failed to fetch data");
  }

  /**
   * Batch multiple requests
   */
  async batch<T>(requests: BatchRequest<T>[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = requests.map(async (request) => {
      try {
        const data = await this.fetch(
          request.key,
          request.fetcher,
          request.options
        );
        results.set(request.key, data);
      } catch (error) {
        console.error(`Failed to fetch ${request.key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Fetch account balance
   */
  async fetchBalance(
    connection: Connection,
    address: string,
    options?: FetchOptions
  ): Promise<number> {
    return this.fetch(
      `balance:${address}`,
      async () => {
        const publicKey = new PublicKey(address);
        const lamports = await connection.getBalance(publicKey);
        return lamports / LAMPORTS_PER_SOL;
      },
      { cacheTTL: 10000, ...options }
    );
  }

  /**
   * Fetch account info
   */
  async fetchAccountInfo(
    connection: Connection,
    address: string,
    options?: FetchOptions
  ) {
    return this.fetch(
      `account:${address}`,
      async () => {
        const publicKey = new PublicKey(address);
        const [slot, balance, accountInfo] = await Promise.all([
          connection.getSlot(),
          connection.getBalance(publicKey),
          connection.getAccountInfo(publicKey),
        ]);

        return {
          slot,
          balanceLamports: balance,
          balanceSol: balance / LAMPORTS_PER_SOL,
          owner: accountInfo?.owner?.toBase58() ?? null,
          executable: accountInfo?.executable ?? false,
          rentEpoch: accountInfo?.rentEpoch ?? null,
        };
      },
      { cacheTTL: 15000, ...options }
    );
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    // Invalid public key errors shouldn't be retried
    if (error?.message?.includes("Invalid public key")) {
      return true;
    }
    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const onChainFetcher = new OnChainFetcher();

