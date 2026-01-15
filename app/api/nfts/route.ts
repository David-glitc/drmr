import { NextRequest, NextResponse } from "next/server";
import { PublicKey, clusterApiUrl, Cluster } from "@solana/web3.js";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";

/**
 * Server-side API route for fetching NFTs using DAS API
 * This uses the Metaplex Digital Asset Standard API for better performance
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

    // Get RPC endpoint based on network - use network-specific RPC endpoints
    // Note: DAS API requires a DAS-enabled RPC endpoint (e.g., Helius, QuickNode, etc.)
    // Public Solana RPC endpoints may not support DAS API
    let rpcUrl: string;

    if (network === "mainnet-beta") {
      rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("mainnet-beta");
    } else if (network === "devnet") {
      rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet");
    } else {
      rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(network as Cluster);
    }

    // RPC endpoint configured (API key masked for security)
    const maskedRpc = rpcUrl.replace(/api-key=[^&]+/, 'api-key=***');
    console.log(`[NFT API] Using RPC endpoint for ${network}:`, maskedRpc);

    // Validate address
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    console.log(`[NFT API] Fetching NFTs for ${address} on ${network}`);

    // Initialize Umi with DAS API
    const umi = createUmi(rpcUrl).use(dasApi());
    const ownerPublicKey = publicKey(address);

    // Get all assets owned by the address using DAS API
    // Filter for NFTs (interface: 'V1_NFT' or 'V1_PRINT')
    const assets = await (umi.rpc as any).getAssetsByOwner({
      owner: ownerPublicKey,
      page: 1,
      limit: 1000, // DAS API supports up to 1000 per request
    });

    console.log(`[NFT API] Found ${assets.items.length} assets`);

    // Filter for NFTs only (exclude fungible tokens)
    // DAS API returns assets with interface types: 'V1_NFT', 'V1_PRINT', 'ProgrammableNFT', etc.
    const nftAssets = assets.items.filter((asset) => {
      const assetInterface = asset.interface;
      return assetInterface === 'V1_NFT' || assetInterface === 'V1_PRINT' || assetInterface === 'ProgrammableNFT' || assetInterface === 'V1_PRINT_EDITION';
    });

    console.log(`[NFT API] Filtered to ${nftAssets.length} NFTs`);

    // Process NFTs - limit to 100 for performance
    const nftsToProcess = nftAssets.slice(0, 100);
    const nftDetails = await Promise.allSettled(
      nftsToProcess.map(async (asset) => {
        try {
          // Extract data from DAS API asset
          const assetId = asset.id;
          const metadata = asset.content?.metadata;
          const links = asset.content?.links;

          // Get name, description, and image
          const name = metadata?.name || "Unnamed NFT";
          const description = metadata?.description || "";
          const image = links?.image || links?.icon || "";

          // Get collection info
          const grouping = asset.grouping?.find(g => g.group_key === 'collection');
          const collection = grouping?.group_value || undefined;

          // Get attributes from metadata
          const attributes = metadata?.attributes as Array<{ trait_type: string; value: string }> | undefined;

          // Build explorer link
          const clusterParam = network === "mainnet-beta" ? "mainnet" : network;
          const explorerLink = `https://solscan.io/token/${assetId}?cluster=${clusterParam}`;

          return {
            mint: assetId,
            name,
            description,
            image,
            explorerLink,
            collection,
            attributes,
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = (error as { code?: number })?.code;

          console.error(`[NFT API] Error processing NFT ${asset.id}:`, errorMessage);

          // Handle rate limiting errors
          if (errorMessage.includes("429") || errorCode === 429) {
            throw error; // Re-throw to stop processing
          }

          // Return minimal NFT data on error
          const clusterParam = network === "mainnet-beta" ? "mainnet" : network;
          return {
            mint: asset.id,
            name: "Unknown NFT",
            description: "",
            image: "",
            explorerLink: `https://solscan.io/token/${asset.id}?cluster=${clusterParam}`,
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
      attributes?: Array<{ trait_type: string; value: string }>;
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
      console.warn(`[NFT API] Rate limit encountered. Returning ${successfulNFTs.length} NFTs out of ${nftAssets.length}`);
    }

    // Filter out NFTs without images
    const validNFTs = successfulNFTs.filter((nft) => nft.image);

    return NextResponse.json({
      nfts: validNFTs,
      total: nftAssets.length,
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
