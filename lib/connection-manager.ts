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
    // Initialize based on NEXT_PUBLIC_MODE or default to devnet
    const mode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
    const initialNetwork: Network = 
      mode === "mainnet" || mode === "mainnet-beta" ? "mainnet-beta" :
      mode === "testnet" ? "testnet" :
      "devnet";
    
    this.defaultEndpoint = this.getRpcEndpoint(initialNetwork);
    console.log(`[ConnectionManager] Initialized with network: ${initialNetwork} from NEXT_PUBLIC_MODE=${mode || "not set"}`);
  }

  /**
   * Get RPC endpoint for a specific network
   */
  private getRpcEndpoint(network: Network): string {
    if (network === "mainnet-beta") {
      return (
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ??
        process.env.NEXT_PUBLIC_SOLANA_RPC ??
        clusterApiUrl("mainnet-beta")
      );
    } else if (network === "devnet") {
      return (
        process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
        process.env.NEXT_PUBLIC_SOLANA_RPC ??
        clusterApiUrl("devnet")
      );
    } else {
      return (
      process.env.NEXT_PUBLIC_SOLANA_RPC ??
        clusterApiUrl("testnet")
      );
    }
  }

  /**
   * Update default endpoint for network switching
   */
  setNetwork(network: Network): void {
    this.defaultEndpoint = this.getRpcEndpoint(network);
    console.log(`[ConnectionManager] Network set to ${network}, using endpoint:`, this.defaultEndpoint);
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
    const endpoint = this.getRpcEndpoint(network);
    return this.getConnection({ endpoint });
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    // Clear all connections from the map
    // Connection objects don't need explicit cleanup in this version
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

