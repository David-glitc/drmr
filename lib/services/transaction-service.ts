export interface TransactionFilters {
  blockTime?: {
    gte?: number; // Unix timestamp (greater than or equal)
    lte?: number; // Unix timestamp (less than or equal)
  };
  status?: 'succeeded' | 'failed';
}

export interface TransactionHistoryParams {
  address: string;
  transactionDetails?: 'full' | 'signatures' | 'none';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  filters?: TransactionFilters;
  network?: 'mainnet-beta' | 'devnet' | 'testnet';
}

export interface Transaction {
  signature: string;
  blockTime: number;
  slot: number;
  status: 'succeeded' | 'failed';
  fee: number;
  // Additional transaction details based on transactionDetails param
  [key: string]: unknown;
}

export interface TransactionHistoryResponse {
  data: Transaction[];
  total: number;
  hasMore: boolean;
}

export class TransactionService {
  /**
   * Get transaction history using standard Solana RPC (fallback for free plans)
   */
  private async getTransactionHistoryFallback(
    params: TransactionHistoryParams
  ): Promise<TransactionHistoryResponse | null> {
    try {
      // Using fallback method (standard Solana RPC)
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const {
        address,
        sortOrder = 'desc',
        limit = 100,
        filters = {},
        network = 'devnet',
      } = params;

      // Get RPC URL
      let rpcUrl: string | undefined;
      if (network === 'mainnet-beta') {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
      } else if (network === 'testnet') {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC;
      } else {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
      }

      if (!rpcUrl) {
        console.error('[TransactionService] No RPC URL for fallback method');
        return null;
      }

      rpcUrl = rpcUrl.trim();
      
      const connection = new Connection(rpcUrl, 'confirmed');
      const publicKey = new PublicKey(address);

      // Get signatures
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: Math.min(limit, 1000), // Standard RPC limit
      });

      // Filter by status if needed
      // Note: We can't filter by status before fetching, so we'll filter after fetching transactions
      const filteredSignatures = signatures;

      // Fetch transaction details
      const transactions: Transaction[] = [];
      const fetchLimit = Math.min(limit, filteredSignatures.length);
      
      for (let i = 0; i < fetchLimit; i++) {
        const sigInfo = filteredSignatures[i];
        
        // Apply blockTime filter if specified
        if (filters.blockTime) {
          if (sigInfo.blockTime) {
            if (filters.blockTime.gte && sigInfo.blockTime < filters.blockTime.gte) {
              continue;
            }
            if (filters.blockTime.lte && sigInfo.blockTime > filters.blockTime.lte) {
              continue;
            }
          }
        }

        try {
          const tx = await connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) continue;

          // Apply status filter
          if (filters.status) {
            const isSucceeded = !tx.meta?.err;
            if (filters.status === 'succeeded' && !isSucceeded) continue;
            if (filters.status === 'failed' && isSucceeded) continue;
          }

          const transaction: Transaction = {
            signature: sigInfo.signature,
            blockTime: sigInfo.blockTime || 0,
            slot: sigInfo.slot,
            status: tx.meta?.err ? 'failed' : 'succeeded',
            fee: tx.meta?.fee || 0,
            transaction: tx.transaction,
            meta: tx.meta,
          };

          transactions.push(transaction);
        } catch (error) {
          console.warn(`[TransactionService] Failed to fetch transaction ${sigInfo.signature}:`, error);
          // Continue with next transaction
        }
      }

      // Sort if needed (signatures are already sorted by default, but we respect sortOrder)
      if (sortOrder === 'asc') {
        transactions.reverse();
      }

      return {
        data: transactions,
        total: transactions.length,
        hasMore: signatures.length >= limit,
      };
    } catch (error) {
      console.error('[TransactionService] Fallback method error:', error);
      return null;
    }
  }

  /**
   * Get transaction history for a wallet address
   */
  async getTransactionHistory(
    params: TransactionHistoryParams
  ): Promise<TransactionHistoryResponse | null> {
    try {
      const {
        address,
        transactionDetails = 'full',
        sortOrder = 'asc',
        limit = 100,
        filters = {},
        network = 'devnet',
      } = params;

      // Get RPC URL from environment variables based on network
      // The RPC URLs already include the API key in the format: https://network.helius-rpc.com/?api-key=KEY
      let rpcUrl: string | undefined;
      
      if (network === 'mainnet-beta') {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
      } else if (network === 'testnet') {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC;
      } else {
        // devnet
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
      }

      if (!rpcUrl) {
        console.error('[TransactionService] No RPC URL configured for network:', network);
        console.error('[TransactionService] Available env vars:', {
          hasMainnet: !!process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET,
          hasDevnet: !!process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET,
          hasGeneric: !!process.env.NEXT_PUBLIC_SOLANA_RPC,
        });
        return null;
      }

      // Trim any whitespace from the RPC URL
      rpcUrl = rpcUrl.trim();

      // Try Helius premium method first (if it's a Helius endpoint)
      // If it fails or is not a Helius endpoint, we'll fall back to standard RPC methods
      const isHeliusEndpoint = rpcUrl.includes('helius-rpc.com');
      
      if (!isHeliusEndpoint) {
        // Not a Helius endpoint, using standard RPC methods
        return this.getTransactionHistoryFallback(params);
      }

      const requestBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransactionsForAddress',
        params: [
          address,
          {
            transactionDetails,
            sortOrder,
            limit,
            ...(Object.keys(filters).length > 0 && { filters }),
          },
        ],
      };

      // Log request params (without sensitive data)
      console.log('[TransactionService] Request params:', { address: address.slice(0, 4) + '...' + address.slice(-4), transactionDetails, sortOrder, limit, hasFilters: Object.keys(filters).length > 0 });

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TransactionService] Helius API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Helius API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('[TransactionService] Helius API returned error:', data.error);
        
        // Check if it's a "paid plans" error - fallback to standard RPC
        if (data.error.message?.includes('paid plans') || data.error.message?.includes('upgrade')) {
          // Helius premium feature not available, falling back to standard RPC methods
          return this.getTransactionHistoryFallback(params);
        }
        
        throw new Error(data.error.message || 'Helius API error');
      }

      // Transform the response to our format
      const transactions = data.result?.data || [];
      const total = data.result?.total || transactions.length;
      const hasMore = transactions.length >= limit;

      return {
        data: transactions,
        total,
        hasMore,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error && 'code' in error ? String(error.code) : '';
      
      // Check for various error conditions that should trigger fallback
      const shouldFallback = 
        errorMessage.includes('paid plans') ||
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('upgrade') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('EAI_AGAIN') ||
        errorMessage.includes('ENOTFOUND') ||
        errorCode === 'EAI_AGAIN' ||
        errorCode === 'ENOTFOUND';
      
      if (shouldFallback) {
        // Helius premium method failed or unavailable, falling back to standard RPC methods
        return this.getTransactionHistoryFallback(params);
      }
      
      console.error('Error fetching transaction history:', error);
      return null;
    }
  }

  /**
   * Get successful transactions for a wallet between two dates
   */
  async getSuccessfulTransactions(
    address: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<TransactionHistoryResponse | null> {
    const filters: TransactionFilters = {
      status: 'succeeded',
    };

    if (startDate || endDate) {
      filters.blockTime = {};
      if (startDate) {
        filters.blockTime.gte = Math.floor(startDate.getTime() / 1000);
      }
      if (endDate) {
        filters.blockTime.lte = Math.floor(endDate.getTime() / 1000);
      }
    }

    return this.getTransactionHistory({
      address,
      transactionDetails: 'full',
      sortOrder: 'asc',
      limit,
      filters,
    });
  }
}

export const transactionService = new TransactionService();
