import { NextRequest, NextResponse } from "next/server";

/**
 * Jupiter Price API Route
 * GET /api/jupiter/price
 * 
 * Proxies price requests to Jupiter API with API key authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "Missing required parameter: ids (comma-separated mint addresses)" },
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

    const url = new URL("https://api.jup.ag/price/v2");
    url.searchParams.set("ids", ids);

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jupiter API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch prices from Jupiter", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in Jupiter price route:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

