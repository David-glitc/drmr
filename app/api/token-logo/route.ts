import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

/**
 * API route to fetch token logos using Metaplex
 * This runs server-side where Metaplex can be used
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mintAddress = searchParams.get("mint");
    const network = searchParams.get("network") || "devnet";

    if (!mintAddress) {
      return NextResponse.json(
        { error: "Mint address is required" },
        { status: 400 }
      );
    }

    // Get RPC endpoint based on network
    let rpcUrl: string;
    if (network === "mainnet-beta") {
      rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
        process.env.NEXT_PUBLIC_SOLANA_RPC ||
        clusterApiUrl("mainnet-beta");
    } else if (network === "devnet") {
      rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ||
        process.env.NEXT_PUBLIC_SOLANA_RPC ||
        clusterApiUrl("devnet");
    } else {
      rpcUrl = clusterApiUrl("testnet");
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const metaplex = Metaplex.make(connection);

    try {
      const mint = new PublicKey(mintAddress);
      const token = await metaplex.tokens().findByMint({ mint });

      if (!token.metadata) {
        return NextResponse.json({ logo: null });
      }

      // Fetch the off-chain metadata JSON
      const response = await fetch(token.metadata.uri);
      if (!response.ok) {
        throw new Error("Failed to fetch metadata JSON");
      }

      const metadataJson = await response.json();
      const logoUrl = metadataJson.image || null;

      return NextResponse.json({ logo: logoUrl });
    } catch (error) {
      console.error(`[TokenLogoAPI] Error fetching logo for mint ${mintAddress}:`, error);
      return NextResponse.json({ logo: null });
    }
  } catch (error) {
    console.error("[TokenLogoAPI] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

