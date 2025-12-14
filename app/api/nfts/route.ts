import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { connectionManager } from "@/lib/connection-manager";

/**
 * Server-side API route for fetching NFTs
 * This keeps Metaplex (and its Node.js dependencies) on the server only
 * 
 * Rate limiting: Loads NFTs in batches to avoid 429 errors
 */
const BATCH_SIZE = 5; // Load 5 NFTs at a time
const BATCH_DELAY = 200; // 200ms delay between batches
const MAX_NFTS = 100; // Limit to first 100 NFTs to avoid excessive requests

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load NFTs in batches with delays to respect rate limits
 */
async function loadNFTsInBatches(
  metaplex: Metaplex,
  nfts: any[],
  limit: number = MAX_NFTS
): Promise<any[]> {
  const nftsToLoad = nfts.slice(0, limit);
  const nftDetails: any[] = [];

  // Process in batches
  for (let i = 0; i < nftsToLoad.length; i += BATCH_SIZE) {
    const batch = nftsToLoad.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (nft) => {
        try {
          const loadedNft = await metaplex.nfts().load({ metadata: nft });
          const json = loadedNft.json;
          const explorerLink = `https://solscan.io/token/${nft.mintAddress.toBase58()}?cluster=mainnet`;

          return {
            mint: nft.mintAddress.toBase58(),
            name: loadedNft.name || "Unnamed NFT",
            description: json?.description || "",
            image: json?.image || "",
            explorerLink,
            collection: loadedNft.collection?.name,
            attributes: json?.attributes,
          };
        } catch (error: any) {
          // Handle rate limit errors specifically
          if (error?.message?.includes("429") || error?.code === 429) {
            console.warn(`Rate limited on NFT ${nft.mintAddress.toBase58()}, skipping...`);
            return null;
          }
          
          console.error(`Error loading NFT ${nft.mintAddress.toBase58()}:`, error);
          return {
            mint: nft.mintAddress.toBase58(),
            name: "Unknown NFT",
            description: "",
            image: "",
            explorerLink: `https://solscan.io/token/${nft.mintAddress.toBase58()}`,
          };
        }
      })
    );

    // Extract successful results
    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        nftDetails.push(result.value);
      }
    }

    // Delay between batches to respect rate limits (except for last batch)
    if (i + BATCH_SIZE < nftsToLoad.length) {
      await sleep(BATCH_DELAY);
    }
  }

  return nftDetails;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    const limit = parseInt(searchParams.get("limit") || String(MAX_NFTS));

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const connection = connectionManager.getDefaultConnection();
    const publicKey = new PublicKey(address);
    
    // Initialize Metaplex on server side (no browser issues)
    const metaplex = Metaplex.make(connection);

    // Find all NFTs owned by the address
    // This is a single RPC call, so it's safe
    let nfts;
    try {
      nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
    } catch (error: any) {
      // Handle rate limit on initial fetch
      if (error?.message?.includes("429") || error?.code === 429) {
        return NextResponse.json(
          { 
            error: "Rate limit exceeded", 
            message: "Too many requests. Please try again in a few moments.",
            nfts: [] 
          },
          { status: 429 }
        );
      }
      throw error;
    }

    if (nfts.length === 0) {
      return NextResponse.json({ nfts: [] });
    }

    // Load NFTs in batches to avoid rate limits
    const nftDetails = await loadNFTsInBatches(metaplex, nfts, limit);

    // Filter out NFTs without images
    const validNFTs = nftDetails.filter((nft) => nft && nft.image);

    return NextResponse.json({ 
      nfts: validNFTs,
      total: nfts.length,
      loaded: validNFTs.length,
      limited: nfts.length > limit
    });
  } catch (error: any) {
    console.error("Error fetching NFTs:", error);
    
    // Handle rate limit errors
    if (error?.message?.includes("429") || error?.code === 429) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "Too many requests to the RPC endpoint. Please try again in a few moments.",
          nfts: [] 
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to fetch NFTs", 
        details: error instanceof Error ? error.message : "Unknown error",
        nfts: [] 
      },
      { status: 500 }
    );
  }
}

