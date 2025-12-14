"use client";

// Common token logos mapping
const TOKEN_LOGOS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
  sol: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
};

// Jupiter token list API
const JUPITER_TOKEN_LIST_URL = "https://token.jup.ag/all";

let cachedTokenList: Map<string, string> | null = null;

export async function getTokenLogo(mint: string, symbol?: string): Promise<string | null> {
  // Check common tokens first
  if (TOKEN_LOGOS[mint] || (symbol && TOKEN_LOGOS[symbol.toLowerCase()])) {
    return TOKEN_LOGOS[mint] || TOKEN_LOGOS[symbol!.toLowerCase()];
  }

  // Try to fetch from Jupiter token list
  try {
    if (!cachedTokenList) {
      const response = await fetch(JUPITER_TOKEN_LIST_URL);
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
      }
    }

    if (cachedTokenList) {
      const logo = cachedTokenList.get(mint) || (symbol ? cachedTokenList.get(symbol.toLowerCase()) : null);
      if (logo) return logo;
    }
  } catch (error) {
    console.error("Error fetching token logo:", error);
  }

  // Fallback to Solana token list
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
    );
    if (response.ok) {
      return response.url;
    }
  } catch (error) {
    // Ignore
  }

  return null;
}


