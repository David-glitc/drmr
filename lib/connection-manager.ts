import { Connection, Commitment, clusterApiUrl } from "@solana/web3.js";

/**
 * Enhanced Connection Manager
 * Handles connection pooling, retries, and optimization
 */

export type Network = "mainnet-beta" | "devnet" | "testnet";

interface ConnectionConfig {
  endpoint: string;
  commitment: Commitment;
  wsEndpoint?: string;
  httpHeaders?: Record<string, string>;
}

class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private defaultEndpoint: string;
  private defaultCommitment: Commitment = "confirmed";

  constructor() {
    this.defaultEndpoint =
      process.env.NEXT_PUBLIC_SOLANA_RPC ??
      process.env.SOLANA_RPC ??
      clusterApiUrl("devnet");
  }

  /**
   * Update default endpoint for network switching
   */
  setNetwork(network: Network): void {
    this.defaultEndpoint = clusterApiUrl(network);
    // Clear existing connections to force new ones with new endpoint
    this.closeAll();
  }

  /**
   * Get or create a connection with specific configuration
   */
  getConnection(config?: Partial<ConnectionConfig>): Connection {
    const endpoint = config?.endpoint ?? this.defaultEndpoint;
    const commitment = config?.commitment ?? this.defaultCommitment;
    const key = `${endpoint}:${commitment}`;

    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }

    const connection = new Connection(endpoint, commitment, {
      commitment,
      confirmTransactionInitialTimeout: 60000,
      fetch: (url, options) => {
        // Add custom headers if provided
        const headers = {
          ...options?.headers,
          ...config?.httpHeaders,
        };
        return fetch(url, { ...options, headers });
      },
    });

    this.connections.set(key, connection);
    return connection;
  }

  /**
   * Get the default connection
   */
  getDefaultConnection(): Connection {
    return this.getConnection();
  }

  /**
   * Get connection for a specific network
   */
  getNetworkConnection(network: Network): Connection {
    const endpoint = clusterApiUrl(network);
    return this.getConnection({ endpoint });
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.forEach((connection) => {
      connection.removeAllListeners();
    });
    this.connections.clear();
  }

  /**
   * Health check for a connection
   */
  async healthCheck(connection?: Connection): Promise<boolean> {
    const conn = connection ?? this.getDefaultConnection();
    try {
      await conn.getSlot();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

// Export convenience function
export function getConnection(): Connection {
  return connectionManager.getDefaultConnection();
}

