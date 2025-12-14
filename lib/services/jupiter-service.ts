/**
 * Jupiter Aggregator Service
 * 
 * Provides integration with Jupiter API for:
 * - Token price quotes
 * - Swap route calculation
 * - Token metadata
 */

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number; // in base units (lamports for SOL)
  slippageBps?: number; // slippage in basis points (default: 50 = 0.5%)
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
}

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpactPct: string;
  routePlan: any[];
}

interface JupiterPriceResponse {
  data: Record<string, {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  }>;
  timeTaken: number;
}

export class JupiterService {
  private baseUrl = "https://api.jup.ag";
  private apiKey: string | null;

  constructor() {
    // API key should be set via environment variable
    // For client-side, we'll use API routes instead
    this.apiKey = null;
  }

  /**
   * Get price quote for a swap
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse | null> {
    try {
      const {
        inputMint,
        outputMint,
        amount,
        slippageBps = 50,
        onlyDirectRoutes = false,
        asLegacyTransaction = false,
      } = params;

      const url = new URL(`${this.baseUrl}/quote`);
      url.searchParams.set("inputMint", inputMint);
      url.searchParams.set("outputMint", outputMint);
      url.searchParams.set("amount", amount.toString());
      url.searchParams.set("slippageBps", slippageBps.toString());
      url.searchParams.set("onlyDirectRoutes", onlyDirectRoutes.toString());
      url.searchParams.set("asLegacyTransaction", asLegacyTransaction.toString());

      const headers: HeadersInit = {};
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching Jupiter quote:", error);
      return null;
    }
  }

  /**
   * Get token prices
   */
  async getPrices(mints: string[]): Promise<JupiterPriceResponse | null> {
    try {
      const url = new URL(`${this.baseUrl}/price/v2`);
      url.searchParams.set("ids", mints.join(","));

      const headers: HeadersInit = {};
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching Jupiter prices:", error);
      return null;
    }
  }

  /**
   * Get price for a single token (in USD)
   */
  async getTokenPrice(mint: string): Promise<number | null> {
    try {
      // SOL mint address
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

      // If asking for SOL price, get SOL/USDC quote
      if (mint === SOL_MINT || mint.toLowerCase() === "sol") {
        const prices = await this.getPrices([SOL_MINT]);
        if (prices?.data[SOL_MINT]) {
          return prices.data[SOL_MINT].price;
        }
        return null;
      }

      // For other tokens, get price via SOL
      const prices = await this.getPrices([mint]);
      if (prices?.data[mint]) {
        return prices.data[mint].price;
      }

      return null;
    } catch (error) {
      console.error("Error fetching token price:", error);
      return null;
    }
  }

  /**
   * Get swap route (for executing swaps)
   */
  async getSwapRoute(quote: JupiterQuoteResponse): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/swap/v1`);
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: "", // Will be set by client
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting swap route:", error);
      return null;
    }
  }
}

// Common token mints
export const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  // Add DRMR mint address when available
  // DRMR: "YOUR_DRMR_MINT_ADDRESS",
};

