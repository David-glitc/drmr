"use client";

import { tokenLogoCache } from "./token-logo-cache";

// Common token logos mapping - hardcoded fallbacks
const TOKEN_LOGOS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
  sol: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
};

// Jupiter token list API (network-agnostic)
const JUPITER_TOKEN_LIST_URL = "https://token.jup.ag/all";

let cachedTokenList: Map<string, string> | null = null;
let logoCache: Map<string, string | null> = new Map(); // Cache for Metaplex API results

/**
 * Get the current network from localStorage or default to devnet
 */
function getCurrentNetwork(): "mainnet-beta" | "devnet" | "testnet" {
  if (typeof window === "undefined") return "devnet";
  const stored = localStorage.getItem("drmr-network");
  if (stored === "mainnet-beta" || stored === "devnet" || stored === "testnet") {
    return stored;
  }
  return "devnet";
}

/**
 * Fetch token logo using Metaplex via API route
 */
async function fetchLogoFromMetaplex(mint: string): Promise<string | null> {
  // Check in-memory cache first
  if (logoCache.has(mint)) {
    return logoCache.get(mint) || null;
  }

  // Check IndexedDB cache
  const cachedUrl = await tokenLogoCache.get(mint);
  if (cachedUrl) {
    logoCache.set(mint, cachedUrl);
    return cachedUrl;
  }

  try {
    const network = getCurrentNetwork();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(
      `/api/token-logo?mint=${encodeURIComponent(mint)}&network=${network}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const logo = data.logo || null;
      
      if (logo) {
        // Cache in IndexedDB for future use
        tokenLogoCache.set(mint, logo).catch((err) => {
          console.warn(`[TokenLogoService] Failed to cache logo for ${mint}:`, err);
        });
      }
      
      logoCache.set(mint, logo); // Cache in memory
      return logo;
    }
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.warn(`[TokenLogoService] Metaplex API error for ${mint}:`, error.message);
    }
    logoCache.set(mint, null); // Cache null to prevent retries
  }

  return null;
}

export async function getTokenLogo(mint: string, symbol?: string): Promise<string | null> {
  // Handle SOL token (id is "sol" but we need wrapped SOL mint address)
  const wrappedSolMint = "So11111111111111111111111111111111111111112";
  const actualMint = mint.toLowerCase() === "sol" ? wrappedSolMint : mint;

  // Check IndexedDB cache first (fastest)
  const cachedUrl = await tokenLogoCache.get(actualMint);
  if (cachedUrl) {
    logoCache.set(actualMint, cachedUrl);
    return cachedUrl;
  }

  // Check common tokens
  const commonLogo = TOKEN_LOGOS[actualMint] || TOKEN_LOGOS[mint] || (symbol && TOKEN_LOGOS[symbol.toLowerCase()]);
  if (commonLogo) {
    // Cache common logos too
    tokenLogoCache.set(actualMint, commonLogo).catch(() => {});
    return commonLogo;
  }

  // Try Metaplex API first (most reliable for SPL tokens)
  // Only try Metaplex if it looks like a valid mint address (base58 encoded, typically 32-44 chars)
  if (actualMint && actualMint.length > 20 && actualMint !== "sol") {
    const metaplexLogo = await fetchLogoFromMetaplex(actualMint);
    if (metaplexLogo) {
      console.log(`[TokenLogoService] Found logo for ${symbol || mint} via Metaplex`);
      return metaplexLogo;
    }
  }

  // Try to fetch from Jupiter token list (works for all networks)
  try {
    if (!cachedTokenList) {
      console.log("[TokenLogoService] Fetching token list from Jupiter API...");
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(JUPITER_TOKEN_LIST_URL, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const tokens = (await response.json()) as Array<{
            address: string;
            symbol: string;
            logoURI?: string;
          }>;
          cachedTokenList = new Map();
          for (const token of tokens) {
            if (token.logoURI) {
              cachedTokenList.set(token.address, token.logoURI);
              cachedTokenList.set(token.symbol.toLowerCase(), token.logoURI);
            }
          }
          console.log(`[TokenLogoService] Cached ${cachedTokenList.size} token logos from Jupiter`);
        } else {
          console.warn(`[TokenLogoService] Jupiter API returned status ${response.status}, using fallback`);
        }
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.warn("[TokenLogoService] Request timeout while fetching Jupiter token list");
          } else {
            console.warn("[TokenLogoService] Network error fetching Jupiter token list:", fetchError.message);
          }
        } else {
          console.warn("[TokenLogoService] Unknown error fetching Jupiter token list:", fetchError);
        }
        // Set empty map to prevent retrying on every call
        cachedTokenList = new Map();
      }
    }

    if (cachedTokenList && cachedTokenList.size > 0) {
      const logo = cachedTokenList.get(mint) || (symbol ? cachedTokenList.get(symbol.toLowerCase()) : null);
      if (logo) {
        console.log(`[TokenLogoService] Found logo for ${symbol || mint} in Jupiter cache`);
        // Cache in IndexedDB for future use
        tokenLogoCache.set(actualMint, logo).catch(() => {});
        return logo;
      }
    }
  } catch (error) {
    console.error("[TokenLogoService] Unexpected error in token logo service:", error);
  }

  console.log(`[TokenLogoService] Logo not found for ${symbol || mint}, using placeholder`);
  return null;
}
