import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { connectionManager } from "@/lib/connection-manager";

/**
 * Server-side API route for fetching NFTs
 * This keeps Metaplex (and its Node.js dependencies) on the server only
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    
    // Get network from query param or use NEXT_PUBLIC_MODE, default to devnet
    const envMode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
    const defaultNetwork = 
      envMode === "mainnet" || envMode === "mainnet-beta" ? "mainnet-beta" :
      envMode === "testnet" ? "testnet" :
      "devnet";
    const network = searchParams.get("network") || defaultNetwork;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Get connection based on network - use network-specific RPC endpoints
    let customRpc: string | undefined;
    
    if (network === "mainnet-beta") {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
    } else if (network === "devnet") {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || process.env.NEXT_PUBLIC_SOLANA_RPC;
    } else {
      customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
    }
    
    const connection = customRpc 
      ? new Connection(customRpc)
      : new Connection(clusterApiUrl(network as any));
    
    console.log(`[NFT API] Using RPC endpoint for ${network}:`, customRpc || clusterApiUrl(network as any));
    
    const publicKey = new PublicKey(address);
    
    console.log(`[NFT API] Fetching NFTs for ${address} on ${network}`);
    
    // Initialize Metaplex on server side (no browser issues)
    const metaplex = Metaplex.make(connection, {
      cluster: network as "mainnet-beta" | "devnet" | "testnet",
    });

    // Find all NFTs owned by the address
    const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
    
    console.log(`[NFT API] Found ${nfts.length} NFTs`);

    // Load full metadata for each NFT with rate limiting protection
    // Limit to 50 NFTs max to avoid rate limits
    const nftsToProcess = nfts.slice(0, 50);
    const nftDetails = await Promise.allSettled(
      nftsToProcess.map(async (nft, index) => {
        try {
          // Add delay to avoid rate limiting (429 errors)
          if (index > 0 && index % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay every 10 NFTs
          }
          
          const loadedNft = await metaplex.nfts().load({ metadata: nft });
          const json = loadedNft.json;
          const clusterParam = network === "mainnet-beta" ? "mainnet" : network;
          const explorerLink = `https://solscan.io/token/${nft.mintAddress.toBase58()}?cluster=${clusterParam}`;

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
          console.error(`[NFT API] Error loading NFT ${nft.mintAddress.toBase58()}:`, error?.message || error);
          
          // Handle rate limiting errors
          if (error?.message?.includes("429") || error?.code === 429) {
            console.error(`[NFT API] Rate limit hit at NFT ${index + 1}/${nftsToProcess.length}. Stopping fetch.`);
            throw error; // Re-throw to stop processing
          }
          
          return {
            mint: nft.mintAddress.toBase58(),
            name: "Unknown NFT",
            description: "",
            image: "",
            explorerLink: `https://solscan.io/token/${nft.mintAddress.toBase58()}?cluster=${network === "mainnet-beta" ? "mainnet" : network}`,
          };
        }
      })
    );
    
    // Filter out failed promises and extract values
    const successfulNFTs = nftDetails
      .filter((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")
      .map(result => result.value);
    
    // Check if we hit rate limits
    const rateLimited = nftDetails.some(result => 
      result.status === "rejected" && 
      (result.reason?.message?.includes("429") || result.reason?.code === 429)
    );
    
    if (rateLimited) {
      console.warn(`[NFT API] Rate limit encountered. Returning ${successfulNFTs.length} NFTs out of ${nfts.length}`);
    }

    // Filter out NFTs without images
    const validNFTs = successfulNFTs.filter((nft) => nft.image);

    return NextResponse.json({ 
      nfts: validNFTs,
      total: nfts.length,
      fetched: successfulNFTs.length,
      rateLimited 
    });
  } catch (error: any) {
    console.error("[NFT API] Error fetching NFTs:", error);
    
    // Handle rate limiting errors specifically
    if (error?.message?.includes("429") || error?.code === 429) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          details: "The RPC endpoint has rate limited this request. Please try again later or use a higher-tier RPC plan.",
          code: 429
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch NFTs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
