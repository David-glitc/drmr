import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
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

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const connection = connectionManager.getDefaultConnection();
    const publicKey = new PublicKey(address);
    
    // Initialize Metaplex on server side (no browser issues)
    const metaplex = Metaplex.make(connection, {
      cluster: "mainnet-beta",
    });

    // Find all NFTs owned by the address
    const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });

    // Load full metadata for each NFT
    const nftDetails = await Promise.all(
      nfts.map(async (nft) => {
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
        } catch (error) {
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

    // Filter out NFTs without images
    const validNFTs = nftDetails.filter((nft) => nft.image);

    return NextResponse.json({ nfts: validNFTs });
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return NextResponse.json(
      { error: "Failed to fetch NFTs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

