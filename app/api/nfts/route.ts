import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl, Cluster } from "@solana/web3.js";
import { Metaplex, Metadata, Nft, Sft } from "@metaplex-foundation/js";

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
      : new Connection(clusterApiUrl(network as Cluster));
    
    console.log(`[NFT API] Using RPC endpoint for ${network}:`, customRpc || clusterApiUrl(network as Cluster));
    
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
          
          // Get mint address - handle different types (Metadata, Nft, Sft)
          let mintAddress: PublicKey;
          
          if ("mintAddress" in nft) {
            // It's a Metadata object
            mintAddress = nft.mintAddress;
          } else if ("mint" in nft) {
            // It's an Nft or Sft
            mintAddress = nft.mint.address;
          } else {
            throw new Error("Could not determine mint address from NFT object");
          }
          
          const mintAddressString = mintAddress.toBase58();
          
          // Load NFT if it's Metadata, otherwise use the NFT/SFT directly
          let loadedNft: Nft | Sft;
          let json: Record<string, unknown> | null = null;
          
          if ("mintAddress" in nft && "uri" in nft) {
            // It's a Metadata object, need to load it
            loadedNft = await metaplex.nfts().load({ metadata: nft as Metadata });
            json = loadedNft.json;
          } else {
            // It's already an Nft or Sft, use it directly
            loadedNft = nft as Nft | Sft;
            json = loadedNft.json;
          }
          
          const clusterParam = network === "mainnet-beta" ? "mainnet" : network;
          const explorerLink = `https://solscan.io/token/${mintAddressString}?cluster=${clusterParam}`;

          return {
            mint: mintAddressString,
            name: loadedNft.name || "Unnamed NFT",
            description: (json?.description as string) || "",
            image: (json?.image as string) || "",
            explorerLink,
            collection: typeof loadedNft.collection === "object" && loadedNft.collection && "name" in loadedNft.collection
              ? (loadedNft.collection.name as string)
              : undefined,
            attributes: json?.attributes,
          };
        } catch (error: unknown) {
          // Get mint address for error handling
          let mintAddressString = "unknown";
          try {
            let mintAddress: PublicKey | undefined;
            if ("mintAddress" in nft) {
              mintAddress = nft.mintAddress;
            } else if ("mint" in nft) {
              mintAddress = nft.mint.address;
            }
            mintAddressString = mintAddress?.toBase58() || "unknown";
          } catch {
            // Ignore errors when trying to get mint address
          }
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = (error as { code?: number })?.code;
          
          console.error(`[NFT API] Error loading NFT ${mintAddressString}:`, errorMessage);
          
          // Handle rate limiting errors
          if (errorMessage.includes("429") || errorCode === 429) {
            console.error(`[NFT API] Rate limit hit at NFT ${index + 1}/${nftsToProcess.length}. Stopping fetch.`);
            throw error; // Re-throw to stop processing
          }
          
          return {
            mint: mintAddressString,
            name: "Unknown NFT",
            description: "",
            image: "",
            explorerLink: `https://solscan.io/token/${mintAddressString}?cluster=${network === "mainnet-beta" ? "mainnet" : network}`,
          };
        }
      })
    );
    
    // Filter out failed promises and extract values
    interface NftResult {
      mint: string;
      name: string;
      description: string;
      image: string;
      explorerLink: string;
      collection?: string;
      attributes?: unknown;
    }
    
    const successfulNFTs = nftDetails
      .filter((result): result is PromiseFulfilledResult<NftResult> => result.status === "fulfilled")
      .map(result => result.value);
    
    // Check if we hit rate limits
    const rateLimited = nftDetails.some(result => {
      if (result.status === "rejected") {
        const reason = result.reason;
        const errorMessage = reason instanceof Error ? reason.message : String(reason);
        const errorCode = (reason as { code?: number })?.code;
        return errorMessage.includes("429") || errorCode === 429;
      }
      return false;
    });
    
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: number })?.code;
    
    console.error("[NFT API] Error fetching NFTs:", errorMessage);
    
    // Handle rate limiting errors specifically
    if (errorMessage.includes("429") || errorCode === 429) {
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
      { error: "Failed to fetch NFTs", details: errorMessage },
      { status: 500 }
    );
  }
}
