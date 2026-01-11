import { NextRequest, NextResponse } from "next/server";
import { transactionService } from "@/lib/services/transaction-service";

/**
 * Transaction History API Route
 * GET /api/transactions
 * 
 * Fetches transaction history for a wallet address using Helius RPC API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const limit = searchParams.get("limit");
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | undefined;
    const status = searchParams.get("status") as "succeeded" | "failed" | undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const network = searchParams.get("network") as "mainnet-beta" | "devnet" | "testnet" | null;

    if (!address) {
      return NextResponse.json(
        { error: "Missing required parameter: address" },
        { status: 400 }
      );
    }

    // Determine network - default to devnet if not specified
    const envMode = process.env.NEXT_PUBLIC_MODE?.toLowerCase();
    const defaultNetwork = 
      envMode === "mainnet" || envMode === "mainnet-beta" ? "mainnet-beta" :
      envMode === "testnet" ? "testnet" :
      "devnet";
    const selectedNetwork = network || defaultNetwork;

    // Build filters
    const filters: any = {};
    if (status) {
      filters.status = status;
    }
    if (startDate || endDate) {
      filters.blockTime = {};
      if (startDate) {
        filters.blockTime.gte = Math.floor(new Date(startDate).getTime() / 1000);
      }
      if (endDate) {
        filters.blockTime.lte = Math.floor(new Date(endDate).getTime() / 1000);
      }
    }

    const result = await transactionService.getTransactionHistory({
      address,
      transactionDetails: "full",
      sortOrder: sortOrder || "desc",
      limit: limit ? parseInt(limit, 10) : 100,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      network: selectedNetwork,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch transaction history" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in transactions route:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
