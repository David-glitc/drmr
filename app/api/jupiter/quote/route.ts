import { NextRequest, NextResponse } from "next/server";

/**
 * Jupiter Quote API Route
 * GET /api/jupiter/quote
 * 
 * Proxies quote requests to Jupiter API with API key authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inputMint = searchParams.get("inputMint");
    const outputMint = searchParams.get("outputMint");
    const amount = searchParams.get("amount");
    const slippageBps = searchParams.get("slippageBps") || "50";

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters: inputMint, outputMint, amount" },
        { status: 400 }
      );
    }

    const apiKey = process.env.JUPITER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Jupiter API key not configured" },
        { status: 500 }
      );
    }

    const url = new URL("https://api.jup.ag/quote");
    url.searchParams.set("inputMint", inputMint);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", amount);
    url.searchParams.set("slippageBps", slippageBps);
    url.searchParams.set("onlyDirectRoutes", "false");
    url.searchParams.set("asLegacyTransaction", "false");

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jupiter API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch quote from Jupiter", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in Jupiter quote route:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

